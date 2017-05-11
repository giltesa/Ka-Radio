/**
 * Karadio Class for Web Control.
 *
 * Note:
 *
 *   Nomenclature used for IDs, cookies, class CSS, and variables JS/PHP:
 *
 *     id      = "id_name"      (With the exception of some IDs with a short prefix, eg: lbitr instead of label_bitr)
 *     cookies = "cookie_name"
 *     class   = "class-name"
 *     var     = "variableName"
 *
 *   Visibility of the parameters and functions:
 *
 *     Private = var nameParamOrFunct
 *     Public  = this.nameParamOrFunct
 *
 */
function Karadio()
{
    //PRIVATE PROPERTIES:
    const
        debug           = true,
        content         = "Content-type",
        ctype           = "application/x-www-form-urlencoded",
        cjson           = "application/json",
        maxStation      = 255,

        versionURL      = "http://test.giltesa.com/karadio/php/version.php",        // http://KaraDio.karawin.fr/version.php
        aboutURL        = "http://test.giltesa.com/karadio/php/about.php",          // http://KaraDio.karawin.fr/history.php
        yoursURL        = "http://test.giltesa.com/karadio/php/yours/index.php",    // http://karadio.karawin.fr/yours/index.php

        karadioURL      = window.location.host,
        karadioDebugURL = "192.168.1.8";

    var
        webSocket, stchanged=false, mPlaying, mURL, timeID, ex;



    //PUBLIC PROPERTIES:
    this.translator;



    // PUBLIC/PRIVATE METHODS:
    this.begin = function()
    {
        loadVersionPage();

        if( timeID != 0 )
            window.clearInterval(timeID);
        timeID = window.setInterval(dTime, 1000);

        loadStationSelect();
        checkWebSocket();
        wifi(false);
        autoStart();
        refresh();
        stationDetails();
    };



    var openWebSocket = function()
    {
        webSocket = new WebSocket("ws://"+ (!debug ? karadioURL : karadioDebugURL) +"/");
        console.log("url:ws://"+ (!debug ? karadioURL : karadioDebugURL) +"/");

        webSocket.onmessage = function(event)
        {
            try
            {
                var arr = JSON.parse(event.data);
                console.log("onmessage:" + event.data);

                if( arr["meta"] )
                    $("#playing").text(arr["meta"].replace(/\\/g,""));

                if( arr["wsvol"] )
                    onRangeVolChange(arr["wsvol"], false);

                if( arr["wsicy"] )
                    icyResp(arr["wsicy"]);

                if( arr["wssound"] )
                    soundResp(arr["wssound"]);

                if( arr["monitor"] )
                    mPlay(arr["monitor"]);

                if( arr["wsstation"] )
                    wsPlayStation(arr["wsstation"]);
            }
            catch(ex)
            {
                console.log("error" + ex);
            }
        };

        webSocket.onopen = function(event)
        {
            console.log("Open, url:" +"ws://"+ (!debug ? karadioURL : karadioDebugURL) +"/");

            if( window.timerID )
            {
                /* a setInterval has been fired */
                window.clearInterval(window.timerID);
                window.timerID = 0;
            }
            refresh();
        };
        webSocket.onclose = function(event)
        {
            console.log("onclose code: "   + event.code);
            console.log("onclose reason: " + event.reason);

            if( !window.timerID )
            {
                /* avoid firing a new setInterval, after one has been done */
                window.timerID = setInterval(function(){ checkWebSocket() }, 2000);
            }
        };
        webSocket.onerror = function (event)
        {
            // handle error event
            console.log("onerror reason: " + event.reason);
            webSocket.close();
        };
    };



    var checkWebSocket = function()
    {
        if( typeof webSocket == "undefined" || webSocket.readyState == webSocket.CLOSED )
            openWebSocket();

        else if( webSocket.readyState == webSocket.OPEN )
            webSocket.send("opencheck");
    };



    var icyResp = function(arr)
    {
        var url, isFull = $("#station_details").is(":checked");

        if( typeof arr["auto"] != "undefined" ){ // undefined for webSocket
            $("#aplay").prop("checked", arr["auto"] == "1" );
        }

        $("#ldescr, #lgenre, #lnot1, #lbitr, #lurl, #icon").addClass("hidden");

        if( isFull )
        {
            if( arr["descr"] )
                $("#ldescr").removeClass("hidden");

            if( arr["genre"] )
                $("#lgenre").removeClass("hidden");

            if( (arr["not1"] || arr["not2"]) )
                $("#lnot1").removeClass("hidden");

            if( arr["bitr"] )
                $("#lbitr").removeClass("hidden");
        }

        $("#curst").text( arr["curst"].replace(/\\/g, "") );
        $("#name" ).text( arr["name"].replace(/\\/g, "") );
        $("#descr").text( arr["descr"].replace(/\\/g, "") );
        $("#genre").text( arr["genre"].replace(/\\/g, "") );
        $("#not1" ).text( arr["not1"].replace(/\\|^<BR>/g, "") );
        $("#not2" ).text( arr["not2"].replace(/\\/g, "") );
        $("#bitr" ).text( arr["bitr"].replace(/\\/g, "") + " kB/s" );

        if( arr["url1"] )
        {
            $("#lurl, #icon").removeClass("hidden");

            url = arr["url1"].replace(/\\| /g, "");

            if( url == "http://www.icecast.org/" )
                $("#icon").prop("src","/logo.png"); //KARAWIN: What is the purpose of this, the code is necessary, the logo.png is necessary?
            else
                $("#icon").prop("src","http://www.google.com/s2/favicons?domain_url=" + url);
        }

        url = arr["url1"].replace(/\\/g, "");
        $("#url1").text(url);
        $("#url2").attr("href", url);
    };



    var soundResp = function(arr)
    {
        var $range;

        $range = getRange("#treble_range");
        $range.set(arr["treb"].replace(/\\/g, ""));
        onRangeChange($range, 1.5, false, true);

        $range = getRange("#bass_range");
        $range.set(arr["bass"].replace(/\\/g, ""));
        onRangeChange($range, 1, false, true);

        $range = getRange("#treblefreq_range");
        $range.set(arr["tfreq"].replace(/\\/g, ""));
        onRangeChangeFreqTreble($range, 1, false, true);

        $range = getRange("#bassfreq_range");
        $range.set(arr["bfreq"].replace(/\\/g, ""));
        onRangeChangeFreqBass($range, 10, false, true);

        $range = getRange("#spacial_range");
        $range.set(arr["spac"].replace(/\\/g, ""));
        onRangeChangeSpatial($range, true);

        $range = getRange("#vol1_range");
        $range.set(arr["vol"].replace(/\\/g, ""));
        onRangeVolChange(getRange("#vol1_range").get(), false);
    };



    var wsPlayStation = function(stationNO)
    {
        $("#stations_select").val( (stationNO >= 0 && stationNO < maxStation) ? stationNO : 0 );
    };



    this.refresh = function()
    {
        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if( xhr.readyState == 4 && xhr.status == 200 )
            {
                try{
                    var arr = JSON.parse(xhr.responseText);
                    icyResp(arr);
                    soundResp(arr);
                }
                catch(ex){
                    console.log("error" + ex);
                }
            }
        };

        try
        {
            webSocket.send("monitor");
            xhr.open("POST", (!debug ? "icy" : "http://"+karadioDebugURL+"/icy"), false);
            xhr.setRequestHeader(content, cjson);
            xhr.send();
        }
        catch(ex){
            console.log("error" + ex);
        }
    };



    var autoStart = function()
    {
        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function ()
        {
            if( xhr.readyState == 4 && xhr.status == 200 )
            {
                var arr = JSON.parse(xhr.responseText);
                $("#aplay").prop("checked", arr["rauto"] == "1" );
            }
        }
        try
        {
            xhr.open("POST", (!debug ? "rauto" : "http://"+karadioDebugURL+"/rauto"), false); // request auto state
            xhr.setRequestHeader(content, ctype);
            xhr.send("&");
        }
        catch(ex){
            console.log("error" + ex);
        }
    };



    this.autoPlay = function()
    {
        try
        {
            xhr.open("POST", (!debug ? "auto" : "http://"+karadioDebugURL+"/auto"), false);
            xhr.setRequestHeader(content, ctype);
            xhr.send("id="+ $("#aplay").is(":checked") +"&");
        }
        catch(ex){
            console.log("error" + ex);
        }
    };



    this.selectStation = function()
    {
        if( $("#aplay").is(":checked") )
            playStation();
    };



    this.playStation = function()
    {
        var $select, id;
        try
        {
            //checkWebSocket();
            mPause();

            $select = $("#stations_select");
            id      = $select.find(":selected").val();

            localStorage.setItem("selindexstore", id.toString());

            xhr = new XMLHttpRequest();
            xhr.open("POST", (!debug ? "play" : "http://"+karadioDebugURL+"/play"), false);
            xhr.setRequestHeader(content, ctype);
            xhr.send("id=" + id + "&");
        }
        catch(ex){
            console.log("error" + ex);
        }
    };



    this.stopStation = function()
    {
        var $select = $("#stations_select");
        var id      = $select.find(":selected").val();

        //checkWebSocket();

        mStop();
        localStorage.setItem("selindexstore", id.toString());

        try
        {
            xhr = new XMLHttpRequest();
            xhr.open("POST", (!debug ? "stop" : "http://"+karadioDebugURL+"/stop"), false);
            xhr.setRequestHeader(content, ctype);
            xhr.send();
        }
        catch(ex){
            console.log("error" + ex);
        }

        $("#playing").text("");
    };




    this.prevStation = function()
    {
        var $select = $("#stations_select");
        var id      = $select.find(":selected").val();

        if( id > 0 )
        {
            $select.selectpicker("val", --id);
            selectStation();
        }
    };



    this.nextStation = function()
    {
        var $select = $("#stations_select");
        var id      = $select.find(":selected").val();
        var length  = $select.find("option").length;

        if( id < length - 1 )
        {
            $select.selectpicker("val", ++id);
            selectStation();
        }
    };



    this.stationDetails = function()
    {
        var isFull = $("#station_details").is(":checked");

        Cookies.set("show_station_details", isFull, { expires: 365 });

        if( !isFull )
            $("#ldescr, #lgenre, #lnot1, #lbitr").addClass("hidden");
        else
            $("#ldescr, #lgenre, #lnot1, #lbitr").removeClass("hidden");
    };



    this.mPlay = function(url)
    {
        if( url != null )
            mURL = url;
        else if( !mPlaying )
            mPlaying = !mPlaying;

        if( mPlaying )
        {
            var monitor    = $("#monitor")[0];
            monitor.src    = mURL.endsWith("/") ? mURL + ";" : mURL;
            monitor.volume = getRange("#volm_range").get() / 100;
            monitor.play();
        }
    };



    this.mStop = function()
    {
        if( mPlaying )
        {
            mPlaying = !mPlaying;

            var monitor = $("#monitor")[0];
            monitor.src = "http://karadio.karawin.fr/silence-1sec.mp3";
            monitor.pause();
        }
    };



    var mPause = function()
    {
        if( mPlaying )
            $("#monitor")[0].pause();
    };



    this.mVol = function($val)
    {
        $("#monitor")[0].volume = $val;
    };



    //It throws an error from the HTML, the function is not found but the code is correct.
    //this.mError = function(){
    //    console.log("monitor error1 " + $("#monitor")[0].error.code);
    //};



    var dTime = function()
    {
        var $elt  = $("#sleep_time");
        var $eltw = $("#wake_time");

        $("#time").text(new Date().toLocaleTimeString());

        if( $elt.is(":disabled") && !isNaN($elt.val()) )
        {
            if( $elt.val() > 0 ){
                $elt.val( $elt.val()-1 );
            }
            else if( $elt.val() == 0 ){
                $elt.val("");
                $("#btn_start_sleep, #sleep_time").prop("disabled", false);
            }
        }

        if( $eltw.is(":disabled") && !isNaN($eltw.val()) )
        {
            if( $eltw.val() > 0 ){
                $eltw.val( $eltw.val()-1 );
            }
            else if( $eltw.val() == 0 ){
                $eltw.val("");
                $("#btn_start_wake, #wake_time").prop("disabled", false);
            }
        }
    };



    this.upTimerSW = function(ev, ope)
    {
        if( ev.keyCode == 13 )
            startTimerSW(ope);
    };



    this.startTimerSW = function(ope)
    {
        var pfx, valm, cur, hop, h0, h1;

        if( ope == "s" || ope == "w")
        {
            pfx = (ope == "s" ? "sleep" : "wake");
            cur = new Date();
            hop = $("#"+pfx+"_time").val().split(":");
            h0  = parseInt(hop[0], 10);
            h1  = parseInt(hop[1], 10);

            if( isNaN(h0) )
                showToast("Error, try again");
            else
            {
                if( isNaN(h1) )
                    valm = h0; // minute mode
                else
                {
                    // time mode
                    fut = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), h0, h1, 0);

                    if( fut.getTime() > cur.getTime() )
                        valm = Math.round((fut.getTime() - cur.getTime()) / 60000); //seconds
                    else
                        valm = 1440 - Math.round((cur.getTime() - fut.getTime()) / 60000); //seconds

                    if( valm == 0 ){
                        valm = fut.getTime() > cur.getTime() ? 1 : 1440;
                    }
                }

                webSocket.send( (ope=="s" ? "startSleep=" : "startWake=") + valm + "&");

                window.setTimeout(function(label){
                    $("#"+pfx+"_time").val(label);
                    $("#btn_start_"+pfx+", #"+pfx+"_time").prop("disabled", true);
                }, 2000, (valm*60)-2);

                showToast(ope=="s" ? "Started, Good night!" : "Started");
            }
        }
    };



    this.stopTimerSW = function(ope)
    {
        if( ope == "s" )
        {
            webSocket.send("stopSleep");
            $("#sleep_time").val("");
            $("#btn_start_sleep, #sleep_time").prop("disabled", false);
        }
        else if( ope == "w" )
        {
            webSocket.send("stopWake");
            $("#wake_time").val("");
            $("#btn_start_wake, #wake_time").prop("disabled", false);
        }
    };



    this.instantPlay = function()
    {
        var curl;
        try
        {
            xhr = new XMLHttpRequest();
            xhr.open("POST", (!debug ? "instant_play" : "http://"+karadioDebugURL+"/instant_play"), false);
            xhr.setRequestHeader(content, ctype);
            curl = $("#instant_path").val();

            if( !(curl.substring(0, 1) === "/") )
                curl = "/" + curl;

            $("#instant_url").val( $("#instant_url").val().replace(/^https?:\/\//, "") );

            curl = fixedEncodeURIComponent(curl);
            xhr.send("url=" + $("#instant_url").val() + "&port=" + $("#instant_port").val() + "&path=" + curl + "&");
        }
        catch(ex){
            console.log("error" + ex);
        }
    };



    this.refreshStations = function()
    {
        var $toast = showToast("Reloaded the stations... Please Wait", 0);

        window.setTimeout(function()
        {
            if( stchanged )
                stChanged();

            localStorage.clear();
            loadStationSelect();
            loadStationTable();
            refresh();

            $toast.snackbar("hide");
        }, 500);
    };



    var loadStationSelect = function()
    {
        var $select, $options=[], id=0;

        $select = $("#stations_select");
        $select.empty();

        showToast("Working... Please Wait");

        function addStation(id, arr)
        {
            if( arr["Name"].length > 0 )
                $options.push( $("<option/>").attr({ "value": id }).text(id +": "+ arr["Name"]) );
        }

        while( id < maxStation )
        {
            idstr = id.toString();

            if( localStorage.getItem(idstr) != null )
            {
                try
                {
                    addStation(id, JSON.parse(localStorage.getItem(idstr)) );
                    id++;
                }
                catch(ex){
                    console.log("error" + ex);
                }
            }
            else
            {
                try
                {
                    xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function()
                    {
                        if( xhr.readyState == 4 && xhr.status == 200 )
                        {
                            try
                            {
                                localStorage.setItem(idstr, xhr.responseText);
                                addStation(id, JSON.parse(xhr.responseText) );
                                id++;
                            }
                            catch(ex){
                                console.log("error" + ex);
                            }
                        }
                    }
                    xhr.open("POST", (!debug ? "getStation" : "http://"+karadioDebugURL+"/getStation"), false);
                    xhr.setRequestHeader(content, ctype);
                    xhr.send("idgp=" + id + "&");
                }
                catch(ex){
                    console.log("error" + ex);
                    //id--; //CAN BE DELETED
                }
            }
        }

        refresh();

        $select.append($options);
        $select.val( parseInt(localStorage.getItem("selindexstore")) );
        $select.selectpicker("refresh");
    };



    this.loadStationTable = function()
    {
        var id      = 0;
        var $tbody  = $("#stations_table").find("tbody");
        var $trRows = [];
        var $tr;


        function getVal(val){
            return (val.length > 116 ? "Error" : val);
        }

        function appendStation(id, arr)
        {
            $trRows.push(
                '<tr id="tr'+ id +'">'
                    +'<td>'+  id +'</td>'
                    +'<td>'+                   getVal(arr['Name']) +'</td>'
                    +'<td class="hidden-xs">'+ getVal(arr['URL'])  +'</td>'
                    +'<td class="hidden-xs">'+ getVal(arr['File']) +'</td>'
                    +'<td class="hidden-xs">'+ getVal(arr['Port']) +'</td>'
                    +'<td class="hidden-xs">'+ getVal(arr['ovol']) +'</td>'
                    +'<td><button type="button" onclick="karadio.editStation('+ id +')" onfocus="this.blur()" class="btn btn-default" data-toggle="modal" data-target="#edit_dialog"><i class="material-icons theme">edit</i></button></td>'
                +'</tr>'
            );
        }


        for( id ; id < maxStation ; id++ )
        {
            idstr = id.toString();

            if( localStorage.getItem(idstr) != null )
            {
                try{
                    arr = JSON.parse(localStorage.getItem(idstr));
                }catch(ex){
                    console.log("error" + ex);
                }
                appendStation(id, arr);
            }
            else
            {
                try
                {
                    xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function()
                    {
                        if( xhr.readyState == 4 && xhr.status == 200 )
                        {
                            try{
                                arr = JSON.parse(xhr.responseText);
                            }catch(ex){
                                console.log("error" + ex);
                            }
                            localStorage.setItem(idstr, xhr.responseText);
                            appendStation(id, arr);
                        }
                    }
                    xhr.open("POST", (!debug ? "getStation" : "http://"+karadioDebugURL+"/getStation"), false);
                    xhr.setRequestHeader(content, ctype);
                    xhr.send("idgp=" + id + "&");
                }
                catch(ex){
                    console.log("error" + ex);
                    id--;
                }
            }
        }

        $tbody.empty();
        $tbody.append($trRows);
        setTheme();

        $tr = $tbody.find("tr");
        $tr.prop("draggable", true);

        $tr.on("dragstart", function(ev){
            ev.originalEvent.dataTransfer.setData("Text", ev.target.id);
        });

        $tr.on("drop", function(ev)
        {
            ev.preventDefault();
            moveNodes( $("#"+ ev.originalEvent.dataTransfer.getData("Text"))[0],  $("#"+ ev.currentTarget.id)[0] );
        });

        $tr.on("dragover", function(ev){
            ev.preventDefault();
        });
    };



    var moveNodes = function(a, b)
    {
        var pa1 = a.parentNode, sib = b.nextSibling, txt;

        if( sib === a )
            sib = sib.nextSibling;

        pa1.insertBefore(a, b);

        for( txt=0 ; txt < maxStation ; txt++ )
        {
            pa1.rows[txt].cells[0].innerText = txt.toString();
            pa1.rows[txt].cells[6].innerHTML = b.parentNode.rows[txt].cells[6].innerHTML;
        }

        $("#stsave").prop("disabled", false);
        stchanged = true;
    };



    this.stChanged = function()
    {
        if( !stchanged )
            return;

        var $toast, i, indmax, tosend, index, tbody;

        function fillInfo(ind)
        {
            id      = tbody.rows[ind].cells[0].innerText;
            name    = tbody.rows[ind].cells[1].innerText;
            url     = tbody.rows[ind].cells[2].innerText;
            file    = tbody.rows[ind].cells[3].innerText;
            port    = tbody.rows[ind].cells[4].innerText;
            ovol    = tbody.rows[ind].cells[5].innerText;
            localStorage.setItem(id, "{\"Name\":\"" + name + "\",\"URL\":\"" + url + "\",\"File\":\"" + file + "\",\"Port\":\"" + port + "\",\"ovol\":\"" + ovol + "\"}");
            tosend = tosend + "&id=" + id + "&url=" + url + "&name=" + name + "&file=" + file + "&port=" + port + "&ovol=" + ovol + "&";
        }

        if( stchanged && confirm(translator.get("The list is modified. Do you want to save the modified list?")) )
        {
            $toast = showToast("Working... Please Wait", 0);
            tbody  = $("#stations_table").find("tbody")[0];

            xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){}

            localStorage.clear();
            indmax = 7;
            index  = 0;

            try
            {
                tosend = "nb=" + indmax;

                for( i=0 ; i < indmax ; i++ )
                    fillInfo(index + i);

                xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
                xhr.setRequestHeader(content, ctype);
                xhr.send(tosend);
            }
            catch(ex){
                console.log("error " + ex);
            }


            for( index=indmax ; index < maxStation ; index += (indmax+1) )
            {
                try
                {
                    tosend = "nb=" + indmax;

                    for( i=0 ; i < indmax ; i++ )
                        fillInfo(index + i);

                    xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
                    xhr.setRequestHeader(content, ctype);
                    xhr.send(tosend);
                }
                catch(ex){
                    console.log("error " + ex);
                }
            }

            $toast.snackbar("hide");
            loadStationSelect();
        }

        $("#stsave").prop("disabled", true);
        stchanged = false;

        refresh();
    };



    this.editStation = function(id)
    {
        var arr;

        function cpedit(arr)
        {
            $("#edit_url").val(arr["URL"]);
            $("#edit_name").val(arr["Name"]);
            $("#edit_path").val(arr["File"]);

            if( arr["Port"] == "0" )
                arr["Port"] = "80";

            $("#edit_port").val(arr["Port"]);

            if( arr["URL"] )
                $("#edit_furl").val("http://"+ arr["URL"] +":"+ arr["Port"] + arr["File"]);
            else
                $("#edit_furl").val("");

            getRange("#edit_ovol").set(arr["ovol"]);
        }

        $("#edit_slot").text(id);
        idstr = id.toString();

        if( localStorage.getItem(idstr) != null )
        {
            try
            {
                arr = JSON.parse(localStorage.getItem(idstr));
            }
            catch(ex){
                console.log("error" + ex);
            }
            cpedit(arr);
        }
        else
        {
            xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function ()
            {
                if( xhr.readyState == 4 && xhr.status == 200 )
                {
                    try
                    {
                        arr = JSON.parse(xhr.responseText);
                    }
                    catch(ex){
                        console.log("error" + ex);
                    }
                    cpedit(arr);
                }
            }
            xhr.open("POST", (!debug ? "getStation" : "http://"+karadioDebugURL+"/getStation"), false);
            xhr.setRequestHeader(content, ctype);
            xhr.send("idgp=" + id + "&");
        }
    };



    this.saveStation = function()
    {
        var
            slot = $("#edit_slot").text(),
            name = $("#edit_name").val(),
            url  = $("#edit_url" ).val().replace(/^https?:\/\//, ""),
            file = $("#edit_path").val(),
            port = $("#edit_port").val(),
            ovol = parseInt(getRange("#edit_ovol").get()),
            jfile;

        if( !(file.substring(0, 1) === "/") )
            file = "/" + file;

        jfile = fixedEncodeURIComponent(file);

        console.log("Path: " + file);
        console.log("JSON: " + jfile);

        try
        {
            xhr = new XMLHttpRequest();
            xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
            xhr.setRequestHeader(content, ctype);
            xhr.send("nb="+ 1 +"&id="+ slot +"&url="+ url +"&name="+ name +"&file="+ jfile +"&ovol="+ ovol +"&port="+ port +"&&");
            localStorage.setItem(slot, "{\"Name\":\""+ name +"\",\"URL\":\""+ url +"\",\"File\":\""+ file +"\",\"Port\":\""+ port +"\",\"ovol\":\""+ ovol +"\"}");
        }
        catch(ex){
            console.log("error save " + ex);
        }

        loadStationSelect();
        loadStationTable();
    };



    this.clearStations = function()
    {
        var
            t1 = translator.get("Warning: This will clear all stations."),
            t2 = translator.get("Be sure to save station before."),
            t3 = translator.get("Clear now?");

        if( !confirm(t1 +"\n"+ t2 +"\n\n"+ t3) )
            refresh();
        else
        {
            xhr = new XMLHttpRequest();
            xhr.open("POST", (!debug ? "clear" : "http://"+karadioDebugURL+"/clear"), false);
            xhr.setRequestHeader(content, ctype);
            xhr.send();
            refreshStations();
        }
    };



    this.printStationList = function()
    {
        var printWin, html, table;

        table = $("#stations_table").clone();

        $(table).find("tr").find("th:eq(6), td:eq(6)").remove();

        $(table).find("tr").find("td:eq(1)").each(function(){
            if( $(this).text().trim() == "" )
                $(this).parent().remove();
        });

        html  = "<html>";
        html += "<h1>"+ translator.get("Karadio Stations list") +"</h1><hr><br/>";
        html += table[0].outerHTML;
        html += "</html>";

        printWin = window.open("");
        printWin.document.write(html);
        printWin.print();
        printWin.close();
    };



    this.resetEQ = function()
    {
        var $range;

        $range = getRange("#treble_range");
        $range.set(0);
        onRangeChange($range, 1.5, false);

        $range = getRange("#bass_range");
        $range.set(0);
        onRangeChange($range, 1, false);

        $range = getRange("#treblefreq_range");
        $range.set(1);
        onRangeChangeFreqTreble($range, 1, false);

        $range = getRange("#bassfreq_range");
        $range.set(2);
        onRangeChangeFreqBass($range, 10, false);

        $range = getRange("#spacial_range");
        $range.set(0);
        onRangeChangeSpatial($range);
    };



    this.onRangeChange = function($range, multiplier, rotate, nosave)
    {
        var spanID = "#"+ $range.target["id"].replace("range","span");
        var value  = parseInt($range.get());

        if( rotate )
            value = $range.options.range.max - value;

        $(spanID).text((value * multiplier) + " dB");

        if( typeof(nosave) == "undefined" )
            saveSoundSettings();
    };



    this.onRangeChangeFreqTreble = function($range, multiplier, rotate, nosave)
    {
        var spanID = "#"+ $range.target.id.replace("range","span");
        var value  = parseInt($range.get());

        if( rotate )
            value = $range.options.range.max - value;

        $(spanID).text(/*"From " +*/ (value * multiplier) + " kHz");

        if( typeof(nosave) == "undefined" )
            saveSoundSettings();
    };



    this.onRangeChangeFreqBass = function($range, multiplier, rotate, nosave)
    {
        var spanID = "#"+ $range.target.id.replace("range","span");
        var value  = parseInt($range.get());

        if( rotate )
            value = $range.options.range.max - value;

        $(spanID).text(/*"Under " +*/ (value * multiplier) + " Hz");

        if( typeof(nosave) == "undefined" )
            saveSoundSettings();
    };



    this.onRangeChangeSpatial = function($range, nosave)
    {
        var spanID = "#"+ $range.target.id.replace("range","span");
        var value  = parseInt($range.get());
        var label;

        switch( value )
        {
            case 0: label = translator.get("Off");     break;
            case 1: label = translator.get("Minimal"); break;
            case 2: label = translator.get("Normal");  break;
            case 3: label = translator.get("Maximal"); break;
        }

        $(spanID).text(label);

        if( typeof(nosave) == "undefined" )
            saveSoundSettings();
    };



    this.onRangeVolChange = function(value, isLocal)
    {
        var logVal = logValue(value);

        getRange("#vol1_range").set(value);
        $("#vol1_span").text(parseInt(logVal * -0.5) + " dB");

        getRange("#vol2_range").set(value);
        $("#vol2_span").text(parseInt(logVal * -0.5) + " dB");


        if( isLocal && webSocket.readyState == webSocket.OPEN )
            webSocket.send("wsvol=" + value + "&");
    };



    var logValue = function(value)
    {
        //Log(128/(Midi Volume + 1)) * (-10) * (Max dB below 0/(-24.04))

        var log = Number(value) + 1;
        var val = Math.round((Math.log10(255 / log) * 105.54571334));

        //console.log("Value= "+value+"   log de val="+log+" "+255/log +"  = "+Math.log10(255/log)  +"   new value= "+val );

        return val;
    };



    var saveSoundSettings = function()
    {
        xhr = new XMLHttpRequest();
        xhr.open("POST", (!debug ? "sound" : "http://"+karadioDebugURL+"/sound"), false);
        xhr.setRequestHeader(content, ctype);
        xhr.send(
            "&bass="         + parseInt(getRange("#bass_range").get())
            + "&treble="     + parseInt(getRange("#treble_range").get())
            + "&bassfreq="   + parseInt(getRange("#bassfreq_range").get())
            + "&treblefreq=" + parseInt(getRange("#treblefreq_range").get())
            + "&spacial="    + parseInt(getRange("#spacial_range").get())
            + "&"
        );
    };



    this.backupStations = function()
    {
        var fileName, output="", textFileAsBlob, downloadLink;


        fileName = $("#backup-name").val();

        if( fileName == "" )
            fileName = "WebStations.txt";

        for( var i=0; i < maxStation; i++ )
            output += localStorage[i] + "\n";

        textFileAsBlob = new Blob([output], { type: "text/plain" }), downloadLink = document.createElement("a");
        downloadLink.style.display = "none";
        downloadLink.setAttribute("download", fileName);
        document.body.appendChild(downloadLink);

        if( window.navigator.msSaveOrOpenBlob ){
            downloadLink.addEventListener("click", function(){
                window.navigator.msSaveBlob(textFileAsBlob, fileName);
            });
        }
        else if( "URL" in window ){
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        }else{
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        }

        downloadLink.click();
    };



    this.restoreStations = function()
    {
        var i, indmax, tosend, reader, lines, line, file, $toast;

        if( window.File && window.FileReader && window.FileList && window.Blob )
        {
            reader = new FileReader();
            xhr    = new XMLHttpRequest();

            reader.onload = function (e)
            {
                function fillInfo(ind, arri)
                {
                    if (!arri["ovol"])
                        arri["ovol"] = "0";

                    tosend += "&id=" + ind + "&url=" + arri["URL"] + "&name=" + arri["Name"] + "&file=" + arri["File"] + "&port=" + arri["Port"] + "&ovol=" + arri["ovol"] + "&";
                    localStorage.setItem(ind, "{\"Name\":\"" + arri["Name"] + "\",\"URL\":\"" + arri["URL"] + "\",\"File\":\"" + arri["File"] + "\",\"Port\":\"" + arri["Port"] + "\",\"ovol\":\"" + arri["ovol"] + "\"}");
                }
                // Entire file
                //console.log(this.result);
                // By lines
                lines = this.result.split("\n");
                localStorage.clear();
                indmax = 3;
                line = 0;
                try
                {
                    tosend = "nb=" + indmax;

                    for( i=0 ; i < indmax ; i++ ){
                        fillInfo(i, JSON.parse(lines[i]));
                    }

                    xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
                    xhr.setRequestHeader(content, ctype);
                    console.log("post " + tosend);
                    xhr.send(tosend);
                }
                catch(ex){
                    console.log("error " + ex);
                }

                for( line=indmax; line < lines.length ; line += (indmax-1) )
                {
                    //console.log(lines[line]);
                    try
                    {
                        tosend = "nb=" + indmax;

                        for( i=0 ; i < indmax ; i++ ){
                            fillInfo(line + i, JSON.parse(lines[line + i]));
                        }

                        xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
                        xhr.setRequestHeader(content, ctype);
                        xhr.send(tosend);
                    }
                    catch(ex){
                        console.log("error " + ex);
                    }
                }
                $toast.snackbar("hide");
                loadStationSelect();
            };

            file = $("#restore-file")[0].files[0];

            if( file == null )
                showToast("Please select a file");
            else
            {
                $toast = showToast("Working... Please Wait", 0);

                window.setTimeout(function(){
                    reader.readAsText(file);
                }, 1000);
            }
        }
    };



    this.wifi = function(valid)
    {
        if( valid )
        {
            var $toast = showToast("System reboot... Please Wait", 0);

            window.setTimeout(function(){
                $toast.snackbar("hide");
                window.setTimeout(function(){
                    window.location.href = "http://"+ $("#ip").val() +"/";
                }, 2000);
            }, 16000);
        }

        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if( xhr.readyState == 4 && xhr.status == 200 )
            {
                var arr = JSON.parse(xhr.responseText);

                $("#ssid").val(arr["ssid"]);
                $("#passwd").val(arr["pasw"]);
                $("#ssid2").val(arr["ssid2"]);
                $("#passwd2").val(arr["pasw2"]);

                $("#mac").text(arr["mac"]);
                $("#dhcp").prop("checked", arr["dhcp"] == "1" );

                $("#ip").val(arr["ip"]);
                $("#mask").val(arr["msk"]);
                $("#gw").val(arr["gw"]);

                $("#ip, #mask, #gw").prop("disabled", $("#dhcp").is(":checked") );

                $("#ua").val(arr["ua"]);
            }
        }
        xhr.open("POST", (!debug ? "wifi" : "http://"+karadioDebugURL+"/wifi"), false);
        xhr.setRequestHeader(content, ctype);
        xhr.send(
            "valid="  + (valid ? 1 : 0) +
            "&ssid="  + encodeURIComponent($("#ssid").val()) +
            "&pasw="  + encodeURIComponent($("#passwd").val()) +
            "&ssid2=" + encodeURIComponent($("#ssid2").val()) +
            "&pasw2=" + encodeURIComponent($("#passwd2").val()) +
            "&ip="    + $("#ip").val() +
            "&msk="   + $("#mask").val() +
            "&gw="    + $("#gw").val() +
            "&ua="    + encodeURIComponent($("#ua").val()) +
            "&dhcp="  + $("#dhcp").is(":checked") + "&"
        );
    };



    this.clickDHCP = function()
    {
        $("#ip, #mask, #gw").prop("disabled", $("#dhcp").is(":checked") );
    }



    this.upgradeFirmware = function()
    {
        if( webSocket.readyState == webSocket.OPEN )
        {
            var $toast = showToast("Updating the firmware, please wait...", 0);

            basket.clear(); //Delete old JS files to force the download of new ones.
            webSocket.send("upgrade");

            window.setTimeout(function(){
                $toast.snackbar("hide");
                window.setTimeout(function(){
                    window.location.reload(true);
                }, 2000);
            }, 30000);
        }
    };



    var fixedEncodeURIComponent = function(str)
    {
        return str.replace(/[&]/g, function(c){
            return "%" + c.charCodeAt(0).toString(16);
        });
    };



    this.parseURL = function(ev)
    {
        if( ev.ctrlKey || ev.keyCode == 17 )
            return;

        var pfx, a;

        pfx = ev.target.id;
        pfx = pfx.slice(0, pfx.indexOf("_"));

        a = document.createElement("a");
        a.href = $("#"+pfx+"_furl").val();

        if( a.hostname == location.hostname )
        {
            $("#"+pfx+"_furl").val("http://"+ $("#"+pfx+"_furl").val().replace(/^http:\/\//, ""));
            a.href = $("#"+pfx+"_furl").val();
        }

        $("#"+pfx+"_url" ).val(a.hostname);
        $("#"+pfx+"_port").val(a.port=="" ? "80" : a.port);
        $("#"+pfx+"_path").val(a.pathname + a.search + a.hash);
    };



    var loadExtPage = function($selector, url)
    {
        if( window.XDomainRequest )
        {
            xhr = new XDomainRequest();
        }
        else if( window.XMLHttpRequest )
        {
            xhr = new XMLHttpRequest();
        }
        xhr.onload = function()
        {
            $selector.html( (/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(xhr.responseText)[1] );
        }
        xhr.open("GET", url, false);
        try{
            xhr.send(null);
        }
        catch(ex){}
    };



    this.loadVersionPage = function()
    {
        loadExtPage( $("#version_container"), versionURL );
        translator.lang(Cookies.get("language"));

        var last      = $("#firmware_last").text().split(".").join("");
        var installed = $("#firmware_installed").text().split(".").join("");

        if( parseInt(installed) < parseInt(last) )
        {
            $("#firmware_last").parent().addClass("label-danger").removeClass("label-success");

            if( Cookies.get("show_toast_updates") === "true" && !Cookies.get("hide_toast_firmware_"+last) )
            {
                var text = translator.get("New firmware %1 available!").replace("%1", $("#firmware_last").text());
                var htmlContent =
                '<div class="row">'+
                    '<div class="pull-left"><i class="material-icons">memory</i> ' + text + '</div>'+
                    '<div class="pull-right"><i class="material-icons">clear</i></div>'+
                '</div>';

                window.setTimeout(function(){
                    $.snackbar({
                        content     : htmlContent,
                        style       : "deeppurple",
                        timeout     : 0,
                        htmlAllowed : true,
                        onClose     : function(){
                            Cookies.set("hide_toast_firmware_"+last, true, { expires: 7 });
                        }
                    });
                }, 2000);
            }
        }
    };



    this.loadAboutPage = function()
    {
        loadExtPage( $("#about_container"), aboutURL );
        translator.lang(Cookies.get("language"));

        $("button").focus(function(){
            var btn = this;
            window.setTimeout(function(){ btn.blur(); }, 100);
        });

        $("#yours_button").one("click", function(ev)
        {
            loadExtPage( $("#yours_dialog").find(".modal-body"), yoursURL );
            translator.lang(Cookies.get("language"));
            setTheme();
        });
    };



    var getRange = function( tagID )
    {
        return $(tagID).get(0).noUiSlider;
    };



    var showToast = function(value, time)
    {
        var htmlContent =
        '<div class="row wait">'+
            '<div class="pull-left">' + translator.get(value) + '</div>'+
            '<div class="pull-right">'+
                '<svg class="spinner" width="24px" height="20px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">'+
                   '<circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>'+
                '</svg>'+
            '</div>'+
        '</div>';

        var $toast = $.snackbar({
            content     : htmlContent,
            style       : "deeppurple",
            timeout     : (time == undefined ? 3000 : time),
            htmlAllowed : true
        });
        $toast.snackbar("show");

        return $toast;
    };



    this.setTheme = function($selector, newValue)
    {
        var newTheme = (newValue !== undefined ? newValue : Cookies.get("theme"));

        //Change the color in the color selection dropdown:
        if( $selector !== undefined )
        {
            $selector.selectpicker("setStyle", "btn-primary btn-success btn-info btn-warning btn-danger btn-inverse", "remove");
            $selector.selectpicker("setStyle", "btn-" + newTheme, "add");
            $selector.selectpicker("refresh");
        }

        //Apply the new theme on the web:
        $("button.theme").removeClass("btn-primary btn-success btn-info btn-warning btn-danger btn-inverse").addClass("btn-" + newTheme);
        $("nav.theme").removeClass("navbar-primary navbar-success navbar-info navbar-warning navbar-danger navbar-inverse").addClass("navbar-" + newTheme);
        $(".togglebutton.theme").removeClass("tb-primary tb-success tb-info tb-warning tb-danger tb-inverse").addClass("tb-" + newTheme);
        $(".slider.theme").removeClass("sl-primary sl-success sl-info sl-warning sl-danger sl-inverse").addClass("sl-" + newTheme);
        $(".checkbox.theme").removeClass("cb-primary cb-success cb-info cb-warning cb-danger cb-inverse").addClass("cb-" + newTheme);

        $(".material-icons.theme").css("color", $("#theme_" + newTheme).css("background-color") );
        $("a.theme").css("color", $("#theme_" + newTheme).css("background-color") );
    }


    return this;
}
var karadio = Karadio();



/**
 * Start Karadio Web.
 *
 */
$(document).ready(function(ev)
{
    $.material.init();
    window.scrollTo(0, 0);


    // ADD EVENTS FOR BUTTONS
    //
    $("#home, #stations, #settings, #about, .lang-selector").click(function(ev){
        if( $(".navbar-collapse").is(":visible") && $(".navbar-toggle").is(":visible") ){
            $(".navbar-collapse").collapse("toggle");
        }
    });

    $("#home, #stations, #settings, #about").click(function(ev)
    {
        window.scrollTo(0, 0);
        karadio.stChanged();
    });

    $("#home").click(function(ev)
    {
        karadio.refresh();
    });

    $("#stations").click(function(ev)
    {
        karadio.loadStationTable();
    });

    $("#settings").click(function(ev)
    {
        karadio.wifi(false);
    });

    $("#about").one("click", function(ev){
        karadio.loadAboutPage();
        karadio.setTheme();
    });

    $("button").focus(function(){
        var btn = this;
        window.setTimeout(function(){ btn.blur(); }, 100);
    });


    $(".tooltips[data-toggle='tooltip']").tooltip();


    if( Cookies.get("show_station_details") === undefined ){
        Cookies.set("show_station_details", true, { expires: 365 });
    }
    $("#station_details").prop("checked", Cookies.get("show_station_details") === "true" );


    if( Cookies.get("show_toast_updates") === undefined ){
        Cookies.set("show_toast_updates", true, { expires: 365 });
    }
    $("#show_toast_updates").prop("checked", Cookies.get("show_toast_updates") === "true");

    $("#show_toast_updates").click(function(ev)
    {
        Cookies.set("show_toast_updates", $(this).is(":checked"), { expires: 365 });
        Cookies.remove("hide_toast_firmware_" + $("#firmware_last").text().split(".").join("") );
    });


    // ADD EVENTS FOR VOLUME BARS
    //
    var slider1 = $("#vol1_range").get(0);
    noUiSlider.create(slider1, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 254 }
    });
    slider1.noUiSlider.on("change", function(){
        karadio.onRangeVolChange(this.get(), true);
    });

    var slider2 = $("#vol2_range").get(0);
    noUiSlider.create(slider2, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 254 }
    });
    slider2.noUiSlider.on("change", function(){
        karadio.onRangeVolChange(this.get(), true);
    });

    var slider3 = $("#volm_range").get(0);
    noUiSlider.create(slider3, {
        start   : [50],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 100 }
    });
    slider3.noUiSlider.on("change", function(){
        karadio.mVol(this.get() / this.options.range.max);
    });

    var slider4 = $("#edit_ovol").get(0);
    noUiSlider.create(slider4, {
        start   : [-126],
        connect : [true, false],
        step    : 2,
        range   : { min: -126, max: 126 }
    });

    var slider5 = $("#treble_range").get(0);
    noUiSlider.create(slider5, {
        start   : [-8],
        connect : [true, false],
        step    : 1,
        range   : { min: -8, max: 7 }
    });
    slider5.noUiSlider.on("change", function(){
        karadio.onRangeChange(this, 1.5, false);
    });

    var slider6 = $("#treblefreq_range").get(0);
    noUiSlider.create(slider6, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 1, max: 15 }
    });
    slider6.noUiSlider.on("change", function(){
        karadio.onRangeChangeFreqTreble(this, 1, false);
    });

    var slider7 = $("#bass_range").get(0);
    noUiSlider.create(slider7, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 15 }
    });
    slider7.noUiSlider.on("change", function(){
        karadio.onRangeChange(this, 1, false);
    });

    var slider8 = $("#bassfreq_range").get(0);
    noUiSlider.create(slider8, {
        start   : [2],
        connect : [true, false],
        step    : 1,
        range   : { min: 2, max: 15 }
    });
    slider8.noUiSlider.on("change", function(){
        karadio.onRangeChangeFreqBass(this, 10, false);
    });

    var slider9 = $("#spacial_range").get(0);
    noUiSlider.create(slider9, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 3 }
    });
    slider9.noUiSlider.on("change", function(){
        karadio.onRangeChangeSpatial(this);
    });


    // ADD EVENTS FOR COLOR THEME DROPDOWN
    //
    var $sTheme = $("#theme_select");

    $sTheme.find("option").each(function(){
        $(this).css("color", $("#theme_" + this.value).css("background-color") );
    });

    if( Cookies.get("theme") === undefined )
    {
        $sTheme.selectpicker("setStyle", "btn-inverse", "add");
        $sTheme.selectpicker("val", "inverse");
        Cookies.set("theme", "inverse", { expires: 365 });
    }else{
        $sTheme.selectpicker("val", Cookies.get("theme"));
        karadio.setTheme($sTheme, Cookies.get("theme"));
    }
    $sTheme.selectpicker("refresh");

    $sTheme.on("shown.bs.select", function(ev){
        Cookies.set("theme", this.value, { expires: 365 });
    });

    $sTheme.change(function(ev)
    {
        karadio.setTheme($(this), this.value);
        Cookies.set("theme", this.value, { expires: 365 });
    });


    // START TRANSLATIONS
    //
    karadio.translator = $("body").translate({ lang: Cookies.get("language"), t: translations });

    $(".lang-selector").click(function(ev)
    {
        var lang = $(this).attr("data-value");
        Cookies.set("language", lang, { expires: 365 });

        karadio.translator.lang(lang);
        ev.preventDefault();
    });


    // START KARADIO
    //
    karadio.begin();


});