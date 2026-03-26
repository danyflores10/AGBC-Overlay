<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>OBS Overlay - Agencia Boliviana de Correos</title>
    @vite(['resources/css/app.css', 'resources/js/overlay.js'])
    <style>
        html, body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: transparent !important;
            font-family: 'Segoe UI', 'Arial', sans-serif;
            width: 100vw;
            height: 100vh;
        }
        #overlay-app {
            width: 1920px;
            height: 1080px;
            transform-origin: top left;
            position: absolute;
            top: 0;
            left: 0;
        }
    </style>
    <script>
        function scaleOverlay() {
            var el = document.getElementById('overlay-app');
            if (!el) return;
            var sx = window.innerWidth / 1920;
            var sy = window.innerHeight / 1080;
            el.style.transform = 'scale(' + sx + ',' + sy + ')';
            el.style.left = '0px';
            el.style.top = '0px';
        }
        window.addEventListener('load', scaleOverlay);
        window.addEventListener('resize', scaleOverlay);
    </script>
</head>
<body>
    <div id="overlay-app"></div>
</body>
</html>
