/**
 * Construct a new JBrowseSyn object.
 */
var JBrowseSyn = function(params) {
    dojo.require("dojo.dnd.Source");
    dojo.require("dojo.dnd.Moveable");
    dojo.require("dojo.dnd.Mover");
    dojo.require("dojo.dnd.move");
    dojo.require("dijit.layout.ContentPane");
    dojo.require("dijit.layout.BorderContainer");

    var refSeqs = params.refSeqs;
    var trackData = params.trackData;
    this.deferredFunctions = [];
    this.dataRoot = params.dataRoot;
    var dataRoot;
    if ("dataRoot" in params)
        dataRoot = params.dataRoot;
    else
        dataRoot = "";

    this.names = new LazyTrie(dataRoot + "data/names/lazy-",
        dataRoot + "data/names/root.json");
    this.tracks = [];
    var brwsr = this;
    brwsr.isInitialized = false;
    dojo.addOnLoad(
        function() {

            var refSeq = refSeqs[21];

            var gv = new Array();
            var viewDndWidget = new Array();
            var trackCreate = new Array();

            var numSeqs = 3;
            var percent = 100 / numSeqs;
            var cont = dojo.byId(params.containerID);

			// Creates Raphael canvas
			var canvas = Raphael(document.getElementById(params.containerID), 3000, 3000);
			
            for (var i=0;i<numSeqs;i=i+1) {

                var e = document.createElement("div");
                e.id = "species" + i;
                e.style.top = (i * percent) +  "%";
                e.style.height = percent + "%";
                e.style.width = "100%";
                e.setAttribute("class","dragWindow");
                e.style.position="absolute";
                cont.appendChild(e);

                gv[i] = new GenomeView(e, 250, refSeq, 1/1000);

                var track = trackInfo[2];

                trackCreate[i] = function (x) {
                    return function(track, hint) {
                        var node;
                        var replaceData = {
                            refseq: refSeq.name
                        };
                        var url = track.url.replace(/\{([^}]+)\}/g, function(match, group) {
                            return replaceData[group];
                        });
                        var klass = eval(track.type);
                        var newTrack = new klass(track, url, refSeq,
                        {
                            changeCallback: function() {
                                gv[x].showVisibleBlocks()
                            },
                            trackPadding: gv[x].trackPadding,
                            baseUrl: "",
                            charWidth: gv[x].charWidth,
                            seqHeight: gv[x].seqHeight
                        });
                        node = gv[x].addTrack(newTrack);

                        return {
                            node: node,
                            data: track,
                            type: ["track"]
                        };
                    }
                }(i);

                viewDndWidget[i] = new dojo.dnd.Source(gv[i].zoomContainer,
                {
                    creator: trackCreate[i],
                    accept: ["track"],
                    withHandles: true
                });


                viewDndWidget[i].insertNodes(false, [track]);
                gv[i].updateTrackList();
                gv[i].centerAtBase(20000000);

            }
			//var glyph = canvas.circle(20, 60, 10);
			//var glyph = canvas.rect(0, 0, 1000, 1000);
			var glyph = canvas.path("M20 60L1000 400");
			// Sets the fill attribute of the circle to red (#f00)
			glyph.attr("fill", "#f00");
			
			// Sets the stroke attribute of the circle to white
			glyph.attr("stroke", "#f00");
        });
};

/**
 * @private
 */
JBrowseSyn.prototype.thumbMoved = function(mover) {
    var pxLeft = parseInt(this.locationThumb.style.left);
    var pxWidth = parseInt(this.locationThumb.style.width);
    var pxCenter = pxLeft + (pxWidth / 2);
    this.view.centerAtBase(((pxCenter / this.overviewBox.w) * (this.view.ref.end - this.view.ref.start)) + this.view.ref.start);
};

/**
 * @private
 */
JBrowseSyn.prototype.onFineMove = function(startbp, endbp) {
    var length = this.view.ref.end - this.view.ref.start;
    var trapLeft = Math.round((((startbp - this.view.ref.start) / length)
        * this.overviewBox.w) + this.overviewBox.l);
    var trapRight = Math.round((((endbp - this.view.ref.start) / length)
        * this.overviewBox.w) + this.overviewBox.l);
    var locationTrapStyle;
    if (dojo.isIE) {
        //IE apparently doesn't like borders thicker than 1024px
        locationTrapStyle =
        "top: " + this.overviewBox.t + "px;"
        + "height: " + this.overviewBox.h + "px;"
        + "left: " + trapLeft + "px;"
        + "width: " + (trapRight - trapLeft) + "px;"
        + "border-width: 0px";
    } else {
        locationTrapStyle =
        "top: " + this.overviewBox.t + "px;"
        + "height: " + this.overviewBox.h + "px;"
        + "left: " + this.overviewBox.l + "px;"
        + "width: " + (trapRight - trapLeft) + "px;"
        + "border-width: " + "0px "
        + (this.overviewBox.w - trapRight) + "px "
        + this.locationTrapHeight + "px " + trapLeft + "px;";
    }

    this.locationTrap.style.cssText = locationTrapStyle;
};

/**
 * @private
 */
JBrowseSyn.prototype.createTrackList = function(parent, params) {
    var leftPane = document.createElement("div");
    leftPane.style.cssText="width: 10em";
    parent.appendChild(leftPane);
    var leftWidget = new dijit.layout.ContentPane({
        region: "left",
        splitter: true
    }, leftPane);
    var trackListDiv = document.createElement("div");
    trackListDiv.id = "tracksAvail";
    trackListDiv.className = "container handles";
    trackListDiv.style.cssText =
    "width: 100%; height: 100%; overflow-x: hidden; overflow-y: auto;";
    trackListDiv.innerHTML =
    "Available Tracks:<br/>(Drag <img src=\""
    + (params.browserRoot ? params.browserRoot : "")
    + "img/right_arrow.png\"/> to view)<br/><br/>";
    leftPane.appendChild(trackListDiv);

    var brwsr = this;

    var changeCallback = function() {
        brwsr.view.showVisibleBlocks(true);
    };

    var trackListCreate = function(track, hint) {
        var node = document.createElement("div");
        node.className = "tracklist-label";
        node.innerHTML = track.key;
        //in the list, wrap the list item in a container for
        //border drag-insertion-point monkeying
        if ("avatar" != hint) {
            var container = document.createElement("div");
            container.className = "tracklist-container";
            container.appendChild(node);
            node = container;
        }
        node.id = dojo.dnd.getUniqueId();
        return {
            node: node,
            data: track,
            type: ["track"]
        };
    };
    this.trackListWidget = new dojo.dnd.Source(trackListDiv,
    {
        creator: trackListCreate,
        accept: ["track"],
        withHandles: false
    });

    var trackCreate = function(track, hint) {
        var node;
        if ("avatar" == hint) {
            return trackListCreate(track, hint);
        } else {
            var replaceData = {
                refseq: brwsr.refSeq.name
            };
            var url = track.url.replace(/\{([^}]+)\}/g, function(match, group) {
                return replaceData[group];
            });
            var klass = eval(track.type);
            var newTrack = new klass(track, url, brwsr.refSeq,
            {
                changeCallback: changeCallback,
                trackPadding: brwsr.view.trackPadding,
                baseUrl: brwsr.dataRoot,
                charWidth: brwsr.view.charWidth,
                seqHeight: brwsr.view.seqHeight
            });
            node = brwsr.view.addTrack(newTrack);
        }
        return {
            node: node,
            data: track,
            type: ["track"]
        };
    };
    this.viewDndWidget = new dojo.dnd.Source(this.view.zoomContainer,
    {
        creator: trackCreate,
        accept: ["track"],
        withHandles: true
    });
    dojo.subscribe("/dnd/drop", function(source,nodes,iscopy){
        brwsr.onVisibleTracksChanged();
    //multi-select too confusing?
    //brwsr.viewDndWidget.selectNone();
    });

    this.trackListWidget.insertNodes(false, params.trackData);
    var oldTrackList = dojo.cookie(this.container.id + "-tracks");
    if (params.tracks) {
        this.showTracks(params.tracks);
    } else if (oldTrackList) {
        this.showTracks(oldTrackList);
    } else if (params.defaultTracks) {
        this.showTracks(params.defaultTracks);
    }

    return trackListDiv;
};

/**
 * @private
 */
JBrowseSyn.prototype.onVisibleTracksChanged = function() {
    this.view.updateTrackList();
    var trackLabels = dojo.map(this.view.tracks,
        function(track) {
            return track.name;
        });
    dojo.cookie(this.container.id + "-tracks",
        trackLabels.join(","),
        {
            expires: 60
        });
    this.view.showVisibleBlocks();
};

/**
 * @private
 * add new tracks to the track list
 * @param trackList list of track information items
 * @param replace true if this list of tracks should replace any existing
 * tracks, false to merge with the existing list of tracks
 */

JBrowseSyn.prototype.addTracks = function(trackList, replace) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(
            function() {
                brwsr.addTracks(trackList, show);
            }
            );
        return;
    }

    this.tracks.concat(trackList);
    if (show || (show === undefined)) {
        this.showTracks(dojo.map(trackList,
            function(t) {
                return t.label;
            }).join(","));
    }
};

/**
 * navigate to a given location
 * @example
 * gb=dojo.byId("GenomeJBrowseSyn").genomeBrowser
 * gb.navigateTo("ctgA:100..200")
 * gb.navigateTo("f14")
 * @param loc can be either:<br>
 * &lt;chromosome&gt;:&lt;start&gt; .. &lt;end&gt;<br>
 * &lt;start&gt; .. &lt;end&gt;<br>
 * &lt;center base&gt;<br>
 * &lt;feature name/ID&gt;
 */
JBrowseSyn.prototype.navigateTo = function(loc) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(function() { 
            brwsr.navigateTo(loc);
        });
        return;
    }

    loc = dojo.trim(loc);
    //                                (chromosome)    (    start      )   (  sep     )     (    end   )
    var matches = String(loc).match(/^(((\S*)\s*:)?\s*(-?[0-9,.]*[0-9])\s*(\.\.|-|\s+))?\s*(-?[0-9,.]+)$/i);
    //matches potentially contains location components:
    //matches[3] = chromosome (optional)
    //matches[4] = start base (optional)
    //matches[6] = end base (or center base, if it's the only one)
    if (matches) {
        if (matches[3]) {
            var refName;
            for (ref in this.allRefs) {
                if ((matches[3].toUpperCase() == ref.toUpperCase())
                    ||
                    ("CHR" + matches[3].toUpperCase() == ref.toUpperCase())
                    ||
                    (matches[3].toUpperCase() == "CHR" + ref.toUpperCase())) {

                    refName = ref;
                }
            }
            if (refName) {
                dojo.cookie(this.container.id + "-refseq", refName, {
                    expires: 60
                });
                if (refName == this.refSeq.name) {
                    //go to given start, end on current refSeq
                    this.view.setLocation(this.refSeq,
                        parseInt(matches[4].replace(/[,.]/g, "")),
                        parseInt(matches[6].replace(/[,.]/g, "")));
                } else {
                    //new refseq, record open tracks and re-open on new refseq
                    var curTracks = [];
                    this.viewDndWidget.forInItems(function(obj, id, map) {
                        curTracks.push(obj.data);
                    });

                    for (var i = 0; i < this.chromList.options.length; i++)
                        if (this.chromList.options[i].text == refName)
                            this.chromList.selectedIndex = i;
                    this.refSeq = this.allRefs[refName];
                    //go to given refseq, start, end
                    this.view.setLocation(this.refSeq,
                        parseInt(matches[4].replace(/[,.]/g, "")),
                        parseInt(matches[6].replace(/[,.]/g, "")));

                    this.viewDndWidget.insertNodes(false, curTracks);
                    this.onVisibleTracksChanged();
                }
                return;
            }
        } else if (matches[4]) {
            //go to start, end on this refseq
            this.view.setLocation(this.refSeq,
                parseInt(matches[4].replace(/[,.]/g, "")),
                parseInt(matches[6].replace(/[,.]/g, "")));
            return;
        } else if (matches[6]) {
            //center at given base
            this.view.centerAtBase(parseInt(matches[6].replace(/[,.]/g, "")));
            return;
        }
    }
    //if we get here, we didn't match any expected location format

    var brwsr = this;
    this.names.exactMatch(loc, function(nameMatches) {
        var goingTo;
        //first check for exact case match
        for (var i = 0; i < nameMatches.length; i++) {
            if (nameMatches[i][1] == loc)
                goingTo = nameMatches[i];
        }
        //if no exact case match, try a case-insentitive match
        if (!goingTo) {
            for (var i = 0; i < nameMatches.length; i++) {
                if (nameMatches[i][1].toLowerCase() == loc.toLowerCase())
                    goingTo = nameMatches[i];
            }
        }
        //else just pick a match
        if (!goingTo) goingTo = nameMatches[0];
        var startbp = goingTo[3];
        var endbp = goingTo[4];
        var flank = Math.round((endbp - startbp) * .2);
        //go to location, with some flanking region
        brwsr.navigateTo(goingTo[2]
            + ":" + (startbp - flank)
            + ".." + (endbp + flank));
        brwsr.showTracks(brwsr.names.extra[nameMatches[0][0]]);
    });
};

/**
 * load and display the given tracks
 * @example
 * gb=dojo.byId("GenomeBrowser").genomeBrowser
 * gb.showTracks("DNA,gene,mRNA,noncodingRNA")
 * @param trackNameList {String} comma-delimited string containing track names,
 * each of which should correspond to the "label" element of the track
 * information dictionaries
 */
JBrowseSyn.prototype.showTracks = function(trackNameList) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(
            function() { 
                brwsr.showTracks(trackNameList);
            }
            );
        return;
    }

    var trackNames = trackNameList.split(",");
    var removeFromList = [];
    var brwsr = this;
    for (var n = 0; n < trackNames.length; n++) {
        this.trackListWidget.forInItems(function(obj, id, map) {
            if (trackNames[n] == obj.data.label) {
                brwsr.viewDndWidget.insertNodes(false, [obj.data]);
                removeFromList.push(id);
            }
        });
    }
    var movedNode;
    for (var i = 0; i < removeFromList.length; i++) {
        this.trackListWidget.delItem(removeFromList[i]);
        movedNode = dojo.byId(removeFromList[i]);
        movedNode.parentNode.removeChild(movedNode);
    }
    this.onVisibleTracksChanged();
};

/**
 * @returns {String} string representation of the current location<br>
 * (suitable for passing to navigateTo)
 */
JBrowseSyn.prototype.visibleRegion = function() {
    return this.view.ref.name + ":" + Math.round(this.view.minVisible()) + ".." + Math.round(this.view.maxVisible());
};

/**
 * @returns {String} containing comma-separated list of currently-viewed tracks<br>
 * (suitable for passing to showTracks)
 */
JBrowseSyn.prototype.visibleTracks = function() {
    var trackLabels = dojo.map(this.view.tracks,
        function(track) {
            return track.name;
        });
    return trackLabels.join(",");
};

/**
 * @private
 */
JBrowseSyn.prototype.onCoarseMove = function(startbp, endbp) {
    var length = this.view.ref.end - this.view.ref.start;
    var trapLeft = Math.round((((startbp - this.view.ref.start) / length)
        * this.overviewBox.w) + this.overviewBox.l);
    var trapRight = Math.round((((endbp - this.view.ref.start) / length)
        * this.overviewBox.w) + this.overviewBox.l);

    this.locationThumb.style.cssText =
    "height: " + (this.overviewBox.h - 4) + "px; "
    + "left: " + trapLeft + "px; "
    + "width: " + (trapRight - trapLeft) + "px;"
    + "z-index: 20";

    //since this method gets triggered by the initial GenomeView.sizeInit,
    //we don't want to save whatever location we happen to start at
    if (! this.isInitialized) return;
    var locString = Util.addCommas(Math.round(startbp)) + " .. " + Util.addCommas(Math.round(endbp));
    this.locationBox.value = locString;
    this.goButton.disabled = true;
    this.locationBox.blur();
    var oldLocMap = dojo.fromJson(dojo.cookie(this.container.id + "-location"));
    if ((typeof oldLocMap) != "object") oldLocMap = {};
    oldLocMap[this.refSeq.name] = locString;
    dojo.cookie(this.container.id + "-location",
        dojo.toJson(oldLocMap),
        {
            expires: 60
        });

    document.title = this.refSeq.name + ":" + locString;
};

/**
 * @private
 */
JBrowseSyn.prototype.createNavBox = function(parent, locLength, params) {
    var brwsr = this;
    var navbox = document.createElement("div");
    var browserRoot = params.browserRoot ? params.browserRoot : "";
    navbox.id = "navbox";
    parent.appendChild(navbox);
    navbox.style.cssText = "text-align: center; padding: 2px; z-index: 10;";

    if (params.bookmark) {
        this.link = document.createElement("a");
        this.link.appendChild(document.createTextNode("Link"));
        this.link.href = window.location.href;
        dojo.connect(this, "onCoarseMove", function() {
            brwsr.link.href = params.bookmark(brwsr);
        });
        dojo.connect(this, "onVisibleTracksChanged", function() {
            brwsr.link.href = params.bookmark(brwsr);
        });
        this.link.style.cssText = "float: right; clear";
        navbox.appendChild(this.link);
    }

    var moveLeft = document.createElement("input");
    moveLeft.type = "image";
    moveLeft.src = browserRoot + "img/slide-left.png";
    moveLeft.id = "moveLeft";
    moveLeft.className = "icon nav";
    moveLeft.style.height = "40px";
    dojo.connect(moveLeft, "click",
        function(event) {
            dojo.stopEvent(event);
            brwsr.view.slide(0.9);
        });
    navbox.appendChild(moveLeft);

    var moveRight = document.createElement("input");
    moveRight.type = "image";
    moveRight.src = browserRoot + "img/slide-right.png";
    moveRight.id="moveRight";
    moveRight.className = "icon nav";
    moveRight.style.height = "40px";
    dojo.connect(moveRight, "click",
        function(event) {
            dojo.stopEvent(event);
            brwsr.view.slide(-0.9);
        });
    navbox.appendChild(moveRight);

    navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));

    var bigZoomOut = document.createElement("input");
    bigZoomOut.type = "image";
    bigZoomOut.src = browserRoot + "img/zoom-out-2.png";
    bigZoomOut.id = "bigZoomOut";
    bigZoomOut.className = "icon nav";
    bigZoomOut.style.height = "40px";
    navbox.appendChild(bigZoomOut);
    dojo.connect(bigZoomOut, "click",
        function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomOut(undefined, undefined, 2);
        });

    var zoomOut = document.createElement("input");
    zoomOut.type = "image";
    zoomOut.src = browserRoot + "img/zoom-out-1.png";
    zoomOut.id = "zoomOut";
    zoomOut.className = "icon nav";
    zoomOut.style.height = "40px";
    dojo.connect(zoomOut, "click",
        function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomOut();
        });
    navbox.appendChild(zoomOut);

    var zoomIn = document.createElement("input");
    zoomIn.type = "image";
    zoomIn.src = browserRoot + "img/zoom-in-1.png";
    zoomIn.id = "zoomIn";
    zoomIn.className = "icon nav";
    zoomIn.style.height = "40px";
    dojo.connect(zoomIn, "click",
        function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomIn();
        });
    navbox.appendChild(zoomIn);

    var bigZoomIn = document.createElement("input");
    bigZoomIn.type = "image";
    bigZoomIn.src = browserRoot + "img/zoom-in-2.png";
    bigZoomIn.id = "bigZoomIn";
    bigZoomIn.className = "icon nav";
    bigZoomIn.style.height = "40px";
    dojo.connect(bigZoomIn, "click",
        function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomIn(undefined, undefined, 2);
        });
    navbox.appendChild(bigZoomIn);

    navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));
    this.chromList = document.createElement("select");
    this.chromList.id="chrom";
    navbox.appendChild(this.chromList);
    this.locationBox = document.createElement("input");
    this.locationBox.size=locLength;
    this.locationBox.type="text";
    this.locationBox.id="location";
    dojo.connect(this.locationBox, "keydown", function(event) {
        if (event.keyCode == dojo.keys.ENTER) {
            brwsr.navigateTo(brwsr.locationBox.value);
            //brwsr.locationBox.blur();
            brwsr.goButton.disabled = true;
            dojo.stopEvent(event);
        } else {
            brwsr.goButton.disabled = false;
        }
    });
    navbox.appendChild(this.locationBox);

    this.goButton = document.createElement("button");
    this.goButton.appendChild(document.createTextNode("Go"));
    this.goButton.disabled = true;
    dojo.connect(this.goButton, "click", function(event) {
        brwsr.navigateTo(brwsr.locationBox.value);
        //brwsr.locationBox.blur();
        brwsr.goButton.disabled = true;
        dojo.stopEvent(event);
    });
    navbox.appendChild(this.goButton);

    return navbox;
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
