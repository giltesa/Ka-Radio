<?php header('Access-Control-Allow-Origin: *'); ?>
<!-- saved from url=(0037)http://karadio.karawin.fr/version.php -->
<!DOCTYPE html>
<html>
<body>

    <p><span class="label label-success">Release <span id="firmware_last">1.3.1</span> - Built on 2017/06/06</span></p>

    <p>New features:</p>
    <ul>
        <!--<li>Edit station now in modal window</li>-->
        <!--<li>Added a mouse event on full url</li>-->
        <li>Many internal optimizations</li>
        <li>New control buttons on the web interface</li>
        <li>A potential huge bug removed</li>
    </ul>

    <div class="alert alert-danger">
        <h4 class="trn">Warning!</h4>
        <p class="trn">If you experiment some strange problems with karadio, please check if the adc (A0) pin is wired to Ground if you don't have a control panel.</p>
    </div>

    <script>
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

        ga('create', 'UA-88358894-1', 'auto');
        ga('send', 'pageview');
    </script>

</body>
</html>