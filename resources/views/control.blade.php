<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Panel de Control - OBS Overlay ABC</title>
    @vite(['resources/css/app.css', 'resources/js/control.js'])
</head>
<body class="ctrl-body">
    <div id="control-app"></div>
</body>
</html>
