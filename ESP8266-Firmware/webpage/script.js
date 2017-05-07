/**
 * Karadio Class for Web Control.
 *
 */
function Karadio()
{
    //PRIVATE PROPERTIES:
    const
        debug           = true,
        karadio         = "Karadio",
        content         = "Content-type",
        ctype           = "application/x-www-form-urlencoded",
        cjson           = "application/json",
        maxStation      = 255,

        versionURL      = "http://test.giltesa.com/karadio/php/version.php",        // http://KaraDio.karawin.fr/version.php
        aboutURL        = "http://test.giltesa.com/karadio/php/about.php",          // http://KaraDio.karawin.fr/history.php
        yoursURL        = "http://test.giltesa.com/karadio/php/yours/index.php";    // http://karadio.karawin.fr/yours/index.php

    var
        karadioURL      = window.location.host,
        karadioDebugURL = "192.168.1.8",
        webSocket, mPlaying, mURL, ex;

    var intervalid, timeID, stchanged = false;



    //PUBLIC PROPERTIES:
    this.translator;



    // PUBLIC METHODS:
    this.begin = function()
    {
        loadVersionPage();

        if( intervalid != 0 )
            window.clearTimeout(intervalid);
        intervalid = 0;

        if( timeID != 0 )
            window.clearInterval(timeID);
        timeID = window.setInterval(dTime, 1000);

        loadStationSelect();
        checkWebSocket();
        refresh(); //REVISAR
        wifi(0);
        autoStart();
        refresh(); //REVISAR
        full();
    };



    this.openWebSocket = function()
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
                    $('#playing').text(arr["meta"].replace(/\\/g,""));
                else
                    $('#playing').text("");

                if( arr["wsvol"] )
                    onRangeVolChange(arr['wsvol'], false);

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
            //console.log("onopen webSocket: "+webSocket);

            if (window.timerID)
            {
                /* a setInterval has been fired */
                window.clearInterval(window.timerID);
                window.timerID = 0;
            }
            refresh();
        };
        webSocket.onclose = function(event)
        {
            console.log("onclose code: " + event.code);
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



    this.wsPlayStation = function(stationNO)
    {
        $("#stationsSelect").val( (stationNO >= 0 && stationNO < maxStation) ? stationNO : 0 );
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

            //while( monitor.networkState == 2 ); //KARAWIN: What is this infinite loop for? It never stops!

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
        var monitor = $("#monitor")[0];

        if( mPlaying )
        {
            //mPlaying = !mPlaying;
            monitor.pause();
        }
    };



    this.mError = function()
    {
        console.log("monitor error1 " + $("#monitor")[0].error.code);
    };



    this.mVol = function($val)
    {
        $("#monitor")[0].volume = $val;
    };



    this.checkWebSocket = function()
    {
        if( typeof webSocket == 'undefined' || webSocket.readyState == webSocket.CLOSED )
            openWebSocket();

        else if( webSocket.readyState == webSocket.OPEN )
            webSocket.send("opencheck");
    };



    //THE COLOR VALIDATION IS NOW CHECKED BY BOOTSTRAP, THAT CAN BE DELETED: REVISAR
    this.checkIP = function($selector)
    {
        //$this.style.color = /^([0-9]+\.){3}[0-9]+$/.test($selector.val()) ? "green" : "red"; //REVISAR
        //$(element).closest('.form-group').addClass('has-error');
        // http://stackoverflow.com/questions/18754020/bootstrap-3-with-jquery-validation-plugin
    };



    this.valid = function()
    {
        this.wifi(1);
        alert("System reboot. Please change your browser address to the new one.");
    };



    this.dTime = function()
    {
        var $elt  = $("#sminutes");
        var $eltw = $("#wminutes");

        $("#time").text(new Date().toLocaleTimeString());

        if( !isNaN($elt.text()) && $elt.text() != "0" )
            $elt.text( $elt.text()-1 );

        if( !isNaN($elt.text()) && $elt.text() == 0 )
            $elt.text("0");

        if( !isNaN($eltw.text()) && $eltw.text() != "0" )
            $eltw.text( $eltw.text()-1 );

        if( !isNaN($eltw.text()) && $eltw.text() == 0 )
            $eltw.text("0");
    };



    this.sleepUp = function(ev)
    {
        if( ev.keyCode == 13 )
            startSleep();
    };



    this.startSleep = function()
    {
        var valm;
        var cur = new Date();
        var hop = $("#sleepdelay").val().split(":");
        var h0  = parseInt(hop[0], 10);
        var h1  = parseInt(hop[1], 10);

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

            webSocket.send("startSleep=" + valm + "&");
            showToast("Started, Good night!");
        }
    };



    this.stopSleep = function()
    {
        webSocket.send("stopSleep");
        $('#sminutes').text("0");
    };



    this.wakeUp = function(ev)
    {
        if( ev.keyCode == 13 )
            startWake();
    };



    this.startWake = function()
    {
        var valm;
        var cur = new Date();
        var hop = $("#wakedelay").val().split(":");
        var h0  = parseInt(hop[0], 10);
        var h1  = parseInt(hop[1], 10);

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

            webSocket.send("startWake=" + valm + "&");
            showToast("Started");
        }
    };



    this.stopWake = function()
    {
        webSocket.send("stopWake");
        $('#wminutes').text("0");
    };



    this.showToast = function(value, time)
    {
        var $toast = $.snackbar({
            content: translator.get(value),
            style:   "deeppurple",
            timeout: (time == undefined ? 2000 : time)
        });
        $toast.snackbar("show");

        return $toast;
    };



    this.saveTextAsFile = function()
    {
        var fileName, output='', textFileAsBlob, downloadLink;


        fileName = $('#filesave').val();

        if( fileName == "" )
            fileName = "WebStations.txt";


        /*for( var i=0; i < maxStation; i++ ){
            output = output + localStorage[i] + '\n';
        }*/
        output = localStorage.join('\n');


        textFileAsBlob = new Blob([output], { type: 'text/plain' }), downloadLink = document.createElement("a");
        downloadLink.style.display = "none";
        downloadLink.setAttribute("download", fileName);
        document.body.appendChild(downloadLink);

        if( window.navigator.msSaveOrOpenBlob )
        {
            downloadLink.addEventListener("click", function(){
                window.navigator.msSaveBlob(textFileAsBlob, fileName);
            });
        }
        else if( 'URL' in window )
        {
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        }
        else
        {
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        }

        downloadLink.click();
    };



    this.full = function()
    {
        var isFull = $('#Full').is(":checked");

        Cookies.set("show-station-details", isFull, { expires: 365 });

        if( !isFull )
            $('#ldescr, #lgenre, #lnot1, #lbitr').addClass("hidden");
        else
            $('#ldescr, #lgenre, #lnot1, #lbitr').removeClass("hidden");
    };



    this.icyResp = function(arr)
    {
        var url, isFull = $('#Full').is(":checked");

        if( typeof arr["auto"] != 'undefined' ){ // undefined for webSocket
            $('#aplay').prop('checked', arr["rauto"] == "1" );
        }

        $('#ldescr, #lgenre, #lnot1, #lbitr, #lurl, #icon').addClass("hidden");

        if( isFull )
        {
            if( arr["descr"] )
                $('#ldescr').removeClass("hidden");

            if( arr["genre"] )
                $('#lgenre').removeClass("hidden");

            if( (arr["not1"] || arr["not2"]) )
                $('#lnot1').removeClass("hidden");

            if( arr["bitr"] )
                $('#lbitr').removeClass("hidden");
        }

        $('#curst').text( arr["curst"].replace(/\\/g, "") );
        $('#name' ).text( arr["name"].replace(/\\/g, "") );
        $('#descr').text( arr["descr"].replace(/\\/g, "") );
        $('#genre').text( arr["genre"].replace(/\\/g, "") );
        $('#not1' ).text( arr["not1"].replace(/\\|^<BR>/g, "") );
        $('#not2' ).text( arr["not2"].replace(/\\/g, "") );
        $('#bitr' ).text( arr["bitr"].replace(/\\/g, "") + " kB/s" );

        if( arr["url1"] )
        {
            $('#lurl, #icon').removeClass("hidden");

            url = arr["url1"].replace(/\\| /g, "");

            if( url == 'http://www.icecast.org/' )
                $("#icon").prop("src","/logo.png");
            else
                $("#icon").prop("src","http://www.google.com/s2/favicons?domain_url=" + url);
        }

        url = arr["url1"].replace(/\\/g, "");
        $('#url1').text(url);
        $("#url2").attr("href", url);
    };



    this.soundResp = function(arr)
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

        $range = getRange("#vol_range");
        $range.set(arr["vol"].replace(/\\/g, ""));
        onRangeVolChange(getRange("#vol_range").get(), false);
    };



    this.refresh = function()
    {
        /*
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
        */
    };



    this.theme = function()
    {
        //webSocket.send("theme");
        //window.location.reload(true); // force reload from the server
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

        if( typeof(nosave) == 'undefined' )
            saveSoundSettings();
    };



    this.onRangeChangeFreqTreble = function($range, multiplier, rotate, nosave)
    {
        var spanID = "#"+ $range.target.id.replace("range","span");
        var value  = parseInt($range.get());

        if( rotate )
            value = $range.options.range.max - value;

        $(spanID).text(/*"From " +*/ (value * multiplier) + " kHz");

        if( typeof(nosave) == 'undefined' )
            saveSoundSettings();
    };



    this.onRangeChangeFreqBass = function($range, multiplier, rotate, nosave)
    {
        var spanID = "#"+ $range.target.id.replace("range","span");
        var value  = parseInt($range.get());

        if( rotate )
            value = $range.options.range.max - value;

        $(spanID).text(/*"Under " +*/ (value * multiplier) + " Hz");

        if( typeof(nosave) == 'undefined' )
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

        if( typeof(nosave) == 'undefined' )
            saveSoundSettings();
    };



    this.logValue = function(value)
    {
        //Log(128/(Midi Volume + 1)) * (-10) * (Max dB below 0/(-24.04))

        var log = Number(value) + 1;
        var val = Math.round((Math.log10(255 / log) * 105.54571334));

        //console.log("Value= "+value+"   log de val="+log+" "+255/log +"  = "+Math.log10(255/log)  +"   new value= "+val );

        return val;
    };



    this.onRangeVolChange = function(value, isLocal)
    {
        var longVal = logValue(value);

        $('#vol1_span').text(parseInt(longVal * -0.5) + " dB");
        $('#vol2_span').text(parseInt(longVal * -0.5) + " dB");
        getRange("#vol1_range").set(value);
        getRange("#vol2_range").set(value);

        if( isLocal && webSocket.readyState == webSocket.OPEN )
            webSocket.send("wsvol=" + value + "&");
    };



    this.wifi = function(valid)
    {
        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if( xhr.readyState == 4 && xhr.status == 200 )
            {
                var arr = JSON.parse(xhr.responseText);

                $('#ssid').val(arr["ssid"]);
                $('#passwd').val(arr["pasw"]);
                $('#ssid2').val(arr["ssid2"]);
                $('#passwd2').val(arr["pasw2"]);

                $('#Mac').val(arr["mac"]);
                $('#dhcp').prop('checked', arr["dhcp"] == "1" );

                $('#ip').val(arr["ip"]);
                checkIP( $('#ip') );

                $('#mask').val(arr["msk"]);
                checkIP( $('#mask') );

                $('#gw').val(arr["gw"]);
                checkIP( $('#gw') );

                var checked = $('#dhcp').is(":checked");
                $('#ip').prop('disabled', checked);
                $('#mask').prop('disabled', checked);
                $('#gw').prop('disabled', checked);

                $('#ua').val(arr["ua"]);
            }
        }
        xhr.open("POST", (!debug ? "wifi" : "http://"+karadioDebugURL+"/wifi"), false);
        xhr.setRequestHeader(content, ctype);
        xhr.send(
            "valid="  + valid +
            "&ssid="  + encodeURIComponent($('ssid').val()) +
            "&pasw="  + encodeURIComponent($('passwd').val()) +
            "&ssid2=" + encodeURIComponent($('ssid2').val()) +
            "&pasw2=" + encodeURIComponent($('passwd2').val()) +
            "&ip="    + $('#ip').val() +
            "&msk="   + $('#mask').val() +
            "&gw="    + $('#gw').val() +
            "&ua="    + encodeURIComponent($('#ua').val()) +
            "&dhcp="  + $('#dhcp').is(":checked") + "&"
        );
    };



    this.instantPlay = function()
    {
        var curl;
        try
        {
            xhr = new XMLHttpRequest();
            xhr.open("POST", (!debug ? "instant_play" : "http://"+karadioDebugURL+"/instant_play"), false);
            xhr.setRequestHeader(content, ctype);
            curl = $('#instant_path').val();

            if( !(curl.substring(0, 1) === "/") )
                curl = "/" + curl;

            $('#instant_url').val( $('#instant_url').val().replace(/^https?:\/\//, '') );

            curl = fixedEncodeURIComponent(curl);
            xhr.send("url=" + $('#instant_url').val() + "&port=" + $('#instant_port').val() + "&path=" + curl + "&");
        }
        catch(ex){
            console.log("error" + ex);
        }
    };



    this.prevStation = function()
    {
        var $select = $("#stationsSelect");
        var id      = $select.find(":selected").val();

        if( id > 0 )
        {
            $select.selectpicker('val', --id);
            Select();
        }
    };



    this.nextStation = function()
    {
        var $select = $("#stationsSelect");
        var id      = $select.find(":selected").val();
        var length  = $('select option').length; //REVISAR

        if( id < length - 1 )
        {
            $select.selectpicker('val', ++id);
            Select();
        }
    };



    this.autoPlay = function()
    {
        try
        {
            xhr.open("POST", (!debug ? "auto" : "http://"+karadioDebugURL+"/auto"), false);
            xhr.setRequestHeader(content, ctype);
            xhr.send("id="+ $('#aplay').is(":checked") +"&");
        }
        catch(ex){
            console.log("error" + ex);
        }
    };



    this.autoStart = function()
    {
        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function ()
        {
            if( xhr.readyState == 4 && xhr.status == 200 )
            {
                var arr = JSON.parse(xhr.responseText);
                $('#aplay').prop('checked', arr["rauto"] == "1" );
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



    this.Select = function()
    {
        if( $('#aplay').is(":checked") )
            playStation();
    };



    this.playStation = function()
    {
        var $select, id;
        try
        {
            //checkWebSocket();
            mPause();

            $select = $("#stationsSelect");
            id      = $select.find(":selected").val();

            localStorage.setItem('selindexstore', id.toString());

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
        var $select = $("#stationsSelect");
        var id      = $select.find(":selected").val();

        //checkWebSocket();

        mStop();
        localStorage.setItem('selindexstore', id.toString());

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
    };



    this.saveSoundSettings = function()
    {
        xhr = new XMLHttpRequest();
        xhr.open("POST", (!debug ? "sound" : "http://"+karadioDebugURL+"/sound"), false);
        xhr.setRequestHeader(content, ctype);
        xhr.send(
            "&bass="         + getRange("#bass_range").get()
            + "&treble="     + getRange("#treble_range").get()
            + "&bassfreq="   + getRange("#bassfreq_range").get()
            + "&treblefreq=" + getRange("#treblefreq_range").get()
            + "&spacial="    + parseInt(getRange("#spacial_range").get())
            + "&"
        );
    };



    this.fixedEncodeURIComponent = function(str)
    {
        return str.replace(/[&]/g, function(c){
            return '%' + c.charCodeAt(0).toString(16);
        });
    };



    this.saveStation = function()
    {
        var
            slot = $('#edit_slot').text(),
            name = $('#edit_name').val(),
            url  = $('#edit_url' ).val().replace(/^https?:\/\//, ''),
            file = $('#edit_file').val(),
            port = $('#edit_port').val(),
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

        abortStation();
        loadStationSelect();
        loadStationTable();
    };



    this.abortStation = function()
    {
        $('#editStationDiv').addClass("hidden");
    };



    this.editStation = function(id)
    {
        var arr;

        function cpedit(arr)
        {
            $('#edit_url').val(arr["URL"]);
            $('#edit_name').val(arr["Name"]);
            $('#edit_file').val(arr["File"]);

            if( arr["Port"] == "0" )
                arr["Port"] = "80";

            $('#edit_port').val(arr["Port"]);
            $('#editStationDiv').removeClass("hidden");

            getRange("#edit_ovol").set(arr["ovol"]);
        }

        $('#edit_slot').text(id);
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



    this.refreshStations = function()
    {
        var $toast = showToast("Reloaded the stations.. Please Wait", 0);

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
            //window.setTimeout(loadStationTable, 5); //DUPLICATE DELETE???
        }
    };



    this.upgradeFirmware = function()
    {
        if( webSocket.readyState == webSocket.OPEN )
        {
            var $toast = showToast("Updating the firmware, the page will refresh when finished, please wait...", 0);

            webSocket.send("upgrade");

            window.setTimeout(function(){
                $toast.snackbar("hide");
                window.setTimeout(function(){
                    window.location.reload(true);
                }, 2000);
            }, 30000);
        }
    };


    /**
     *
     */
    this.loadAboutPage = function()
    {
        loadExtPage( $("#about-container"), aboutURL );
        translator.lang(Cookies.get("language"));

        $("#yours-button").one("click", function(ev)
        {
            loadExtPage( $("#yours-dialog").find(".modal-body"), yoursURL );
            translator.lang(Cookies.get("language"));
            setTheme();
        });
    };


    /**
     *
     */
    this.loadVersionPage = function()
    {
        loadExtPage( $("#version-container"), versionURL );
        translator.lang(Cookies.get("language"));

        var last      = $("#firmware-last").text().split('.').join('');
        var installed = $("#firmware-installed").text().split('.').join('');

        if( parseInt(installed) < parseInt(last) )
        {
            $("#firmware-last").parent().addClass('label-danger').removeClass('label-success');

            if( Cookies.get("show-toast-updates") === "true" && !Cookies.get("hide-toast-firmware-"+last) )
            {
                var text = translator.get("New firmware %1 available!").replace("%1", $("#firmware-last").text());
                var htmlContent =
                "<div class='row'>"+
                    "<div class='pull-left'><i class='material-icons'>memory</i> " + text + "</div>"+
                    "<div class='text-right'><i class='material-icons'>clear</i></div>"+
                "</div>";

                window.setTimeout(function(){
                    $.snackbar({
                        content:     htmlContent,
                        style:       "deeppurple",
                        timeout:     0,
                        htmlAllowed: true,
                        onClose: function(){
                            Cookies.set("hide-toast-firmware-"+last, true, { expires: 7 });
                        }
                    });
                }, 2000);
            }
        }
    };



    this.downloadStations = function()
    {
        var i, indmax, tosend, arr, reader, lines, line, file;

        if( window.File && window.FileReader && window.FileList && window.Blob )
        {
            reader = new FileReader();
            xhr    = new XMLHttpRequest();

            xhr.onreadystatechange = function ()
            {
                showToast("Working.. Please Wait");
            }
            reader.onload = function (e)
            {
                function fillInfo(ind, arri)
                {
                    if (!arri["ovol"]) arri["ovol"] = "0";
                    tosend = tosend + "&id=" + ind + "&url=" + arri["URL"] + "&name=" + arri["Name"] + "&file=" + arri["File"] + "&port=" + arri["Port"] + "&ovol=" + arri["ovol"] + "&";
                    localStorage.setItem(ind, "{\"Name\":\"" + arri["Name"] + "\",\"URL\":\"" + arri["URL"] + "\",\"File\":\"" + arri["File"] + "\",\"Port\":\"" + arri["Port"] + "\",\"ovol\":\"" + arri["ovol"] + "\"}");
                }
                // Entire file
                //console.log(this.result);
                // By lines
                lines = this.result.split('\n');
                localStorage.clear();
                indmax = 3;
                line = 0;
                try
                {
                    tosend = "nb=" + indmax;
                    for (i = 0; i < indmax; i++)
                    {
                        arr = JSON.parse(lines[i]);
                        fillInfo(i, arr);
                    }
                    xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
                    xhr.setRequestHeader(content, ctype);
                    console.log("post " + tosend);
                    xhr.send(tosend);
                }
                catch(ex){
                    console.log("error " + ex);
                }

                //}
                indmax = 2;
                for( line = 3; line < lines.length; line += indmax )
                {
                    //console.log(lines[line]);
                    try
                    {
                        tosend = "nb=" + indmax;
                        for( i = 0; i < indmax; i++ )
                        {
                            arr = JSON.parse(lines[line + i]);
                            fillInfo(line + i, arr);
                        }
                        xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
                        xhr.setRequestHeader(content, ctype);
                        xhr.send(tosend);
                    }
                    catch(ex){
                        console.log("error " + ex);
                    }
                }
                loadStationSelect();
            };

            file = $('#fileload').files[0];

            if( file == null )
                alert("Please select a file");
            else
            {
                //stopStation();
                showToast("Working.. Please Wait");
                reader.readAsText(file);
            }
        }
    };



    /*this.dragStart = function(ev)
    {
        //ev.dataTransfer.setData("Text", ev.target.id);
    };*/



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



    /*dragDrop = function(ev)
    {
        ev.preventDefault();
        var TRStart = document.getElementById(ev.dataTransfer.getData("text"));
        var TRDrop = document.getElementById(ev.currentTarget.id);
        moveNodes(TRStart, TRDrop);
    };*/



    /*allowDrop = function(ev)
    {
        ev.preventDefault();
    };*/



    this.stChanged = function()
    {
        if( !stchanged )
            return;

        var i, indmax, tosend, index, tbody = document.getElementById("stationsTable").getElementsByTagName('tbody')[0];

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

        showToast("Working.. Please Wait");

        if( stchanged && confirm("The list is modified. Do you want to save the modified list?") )
        {
            xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){}

            showToast("Working.. Please Wait");
            localStorage.clear();
            indmax = 7;
            index  = 0;
            //{
            try
            {
                tosend = "nb=" + indmax;

                for( i=0 ; i < indmax ; i++)
                    fillInfo(index + i);

                xhr.open("POST", (!debug ? "setStation" : "http://"+karadioDebugURL+"/setStation"), false);
                xhr.setRequestHeader(content, ctype);
                xhr.send(tosend);
            }
            catch(ex){
                console.log("error " + ex);
            }
            //}

            indmax = 8;
            for( index = 7 ; index < maxStation ; index += indmax )
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
            loadStationSelect();
        }

        $("#stsave").prop("disabled", true);
        stchanged = false;

        refresh();
    };



    this.loadStationTable = function()
    {
        var id      = 0;
        var $tbody  = $("#stationsTable").find('tbody');
        var $trRows = [];


        function getVal(val){
            return (val.length > 116 ? "Error" : val);
        }

        function appendStation(id, arr)
        {
            $trRows.push(
                "<tr id='tr"+ id +"'>"
                    +"<td>"+  id +"</td>"
                    +"<td>"+                   getVal(arr["Name"]) +"</td>"
                    +"<td class='hidden-xs'>"+ getVal(arr["URL"])  +"</td>"
                    +"<td class='hidden-xs'>"+ getVal(arr["File"]) +"</td>"
                    +"<td class='hidden-xs'>"+ getVal(arr["Port"]) +"</td>"
                    +"<td class='hidden-xs'>"+ getVal(arr["ovol"]) +"</td>"
                    +"<td><a href='#' onclick='editStation("+ id +")'><i class='material-icons theme'>edit</i></a></td>"
                +"</tr>"
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


        /*$trRows.find("tr").draggable({
            start:function(ev, ui){
                //this is where dragging starts when you push mousedown and move mouse
                //dragStart
                 ev.dataTransfer.setData("Text", ev.target.id);
            },
            drag:function(ev, ui){
                 //this function will be called after drag started each time you move your mouse
                 //allowDrop
                 //ev.preventDefault();
            },
            stop:function(ev, ui){
                //this is where you release mouse button
                //dragDrop
                ev.preventDefault();
                var TRStart = document.getElementById(ev.dataTransfer.getData("text"));
                var TRDrop  = document.getElementById(ev.currentTarget.id);
                moveNodes(TRStart, TRDrop);
            }
        });*/


        $tbody.empty();
        $tbody.append($trRows);
        setTheme();
    };



    var loadStationSelect = function()
    {
        var $select, $options=[], id=0;

        $select = $("#stationsSelect");
        $select.empty();

        showToast("Working.. Please Wait");

        function addStation(id, arr)
        {
            if( arr["Name"].length > 0 )
                $options.push( $('<option/>').attr({ 'value': id }).text(id +": "+ arr["Name"]) );
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
        $select.val( parseInt(localStorage.getItem('selindexstore')) );
        $select.selectpicker('refresh');
    };



    this.printStationList = function()
    {
        var printWin, html, table;

        table = $('#stationsTable').clone();

        $(table).find('tr').find('th:eq(6), td:eq(6)').remove();

        $(table).find('tr').find('td:eq(1)').each(function(){
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



    //PRIVATE METHODS:
    var loadExtPage = function( $selector, url )
    {
        if( window.XDomainRequest )
        {
            xhr = new XDomainRequest();
        }
        else if( window.XMLHttpRequest )
        {
            xhr = new XMLHttpRequest();
        }
        xhr.onload = function(){
            $selector.html(xhr.responseText);
        }
        xhr.open("GET", url, false);
        try{
            xhr.send(null);
        }
        catch(ex){}
    };



    var getRange = function( tagID )
    {
        return $(tagID).get(0).noUiSlider;
    };



    //function setTheme($selector, newValue)
    this.setTheme = function($selector, newValue)
    {
        var newTheme = (newValue !== undefined ? newValue : Cookies.get("theme"));

        //Change the color in the color selection dropdown:
        if( $selector !== undefined )
        {
            $selector.selectpicker("setStyle", "btn-primary btn-success btn-info btn-warning btn-danger btn-inverse", "remove");
            $selector.selectpicker("setStyle", "btn-" + newTheme, "add");
            $selector.selectpicker('refresh');
        }

        //Apply the new theme on the web:
        $("button.theme").removeClass("btn-primary btn-success btn-info btn-warning btn-danger btn-inverse").addClass("btn-" + newTheme);
        $("nav.theme").removeClass("navbar-primary navbar-success navbar-info navbar-warning navbar-danger navbar-inverse").addClass("navbar-" + newTheme);

        $(".material-icons.theme").css("color", $("#theme-" + newTheme).css("background-color") );
        $("a.theme").css("color", $("#theme-" + newTheme).css("background-color") );
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
            $('.navbar-collapse').collapse('toggle');
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
        karadio.wifi(0);
    });

    $("#about").click(function(ev)
    {

    });

    $("#about").one("click", function(ev){
        karadio.loadAboutPage();
        karadio.setTheme();
    });

    $('button').focus(function(){
        var btn = this;
        window.setTimeout(function(){ btn.blur(); }, 100);
    });


    $('.tooltips[data-toggle="tooltip"]').tooltip();


    if( Cookies.get("show-station-details") === undefined ){
        Cookies.set("show-station-details", true, { expires: 365 });
    }
    $('#Full').prop('checked', Cookies.get("show-station-details") === "true" );


    if( Cookies.get("show-toast-updates") === undefined ){
        Cookies.set("show-toast-updates", true, { expires: 365 });
    }
    $('#show-toast-updates').prop('checked', Cookies.get("show-toast-updates") === "true");

    $("#show-toast-updates").click(function(ev)
    {
        Cookies.set("show-toast-updates", $(this).is(":checked"), { expires: 365 });
        Cookies.remove("hide-toast-firmware-" + $("#firmware-last").text().split('.').join('') );
    });


    // ADD EVENTS FOR VOLUME BARS
    //
    var slider1 = $('#vol1_range').get(0);
    noUiSlider.create(slider1, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 254 }
    });
    slider1.noUiSlider.on('change', function(){
        karadio.onRangeVolChange(this.get(), true);
    });

    var slider2 = $('#vol2_range').get(0);
    noUiSlider.create(slider2, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 254 }
    });
    slider2.noUiSlider.on('change', function(){
        karadio.onRangeVolChange(this.get(), true);
    });

    var slider3 = $('#volm_range').get(0);
    noUiSlider.create(slider3, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 100 }
    });
    slider3.noUiSlider.on('change', function(){
        karadio.mVol(this.get() / this.options.range.max);
    });

    var slider4 = $('#edit_ovol').get(0);
    noUiSlider.create(slider4, {
        start   : [-126],
        connect : [true, false],
        step    : 2,
        range   : { min: -126, max: 126 }
    });

    var slider5 = $('#treble_range').get(0);
    noUiSlider.create(slider5, {
        start   : [-8],
        connect : [true, false],
        step    : 1,
        range   : { min: -8, max: 7 }
    });
    slider5.noUiSlider.on('change', function(){
        karadio.onRangeChange(this, 1.5, false);
    });

    var slider6 = $('#treblefreq_range').get(0);
    noUiSlider.create(slider6, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 1, max: 15 }
    });
    slider6.noUiSlider.on('change', function(){
        karadio.onRangeChangeFreqTreble(this, 1, false);
    });

    var slider7 = $('#bass_range').get(0);
    noUiSlider.create(slider7, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 15 }
    });
    slider7.noUiSlider.on('change', function(){
        karadio.onRangeChange(this, 1, false);
    });

    var slider8 = $('#bassfreq_range').get(0);
    noUiSlider.create(slider8, {
        start   : [2],
        connect : [true, false],
        step    : 1,
        range   : { min: 2, max: 15 }
    });
    slider8.noUiSlider.on('change', function(){
        karadio.onRangeChangeFreqBass(this, 10, false);
    });

    var slider9 = $('#spacial_range').get(0);
    noUiSlider.create(slider9, {
        start   : [0],
        connect : [true, false],
        step    : 1,
        range   : { min: 0, max: 3 }
    });
    slider9.noUiSlider.on('change', function(){
        karadio.onRangeChangeSpatial(this);
    });


    // ADD EVENTS FOR COLOR THEME DROPDOWN
    //
    $('#theme-select').load('show.bs.select', function(ev)
    {
        $(this).find('option').each(function(){
            $(this).css("color", $("#theme-" + this.value).css("background-color") );
        });

        if( Cookies.get("theme") === undefined )
        {
            $(this).selectpicker("setStyle", "btn-inverse", "add");
            $(this).selectpicker('val', "inverse");
            Cookies.set("theme", "inverse", { expires: 365 });
        }
        else
        {
            $(this).selectpicker('val', Cookies.get("theme"));
            karadio.setTheme($(this), Cookies.get("theme"));
        }

        $(this).selectpicker('refresh');
    });

    $('#theme-select').on('shown.bs.select', function(ev){
        Cookies.set("theme", this.value, { expires: 365 });
    });

    $("#theme-select").change(function(ev)
    {
        karadio.setTheme($(this), this.value);
        Cookies.set("theme", this.value, { expires: 365 });
    });


    // START TRANSLATIONS
    //
    karadio.translator = $('body').translate({ lang: Cookies.get("language"), t: translations });

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