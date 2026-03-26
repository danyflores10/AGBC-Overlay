<?php

namespace App\Http\Controllers;

use App\Models\OverlayConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class OverlayController extends Controller
{
    public function getConfig(): JsonResponse
    {
        $config = OverlayConfig::active();
        return response()->json($config->config);
    }

    public function updateConfig(Request $request): JsonResponse
    {
        $config = OverlayConfig::active();
        $currentConfig = $config->config ?? OverlayConfig::defaults();
        $newConfig = array_merge($currentConfig, $request->all());
        $config->update(['config' => $newConfig]);

        return response()->json([
            'success' => true,
            'config' => $newConfig,
        ]);
    }

    public function resetConfig(): JsonResponse
    {
        $config = OverlayConfig::active();
        $config->update(['config' => OverlayConfig::defaults()]);

        return response()->json([
            'success' => true,
            'config' => OverlayConfig::defaults(),
        ]);
    }

    /**
     * Subir diapositiva (imagen, PDF o PowerPoint)
     */
    public function uploadSlide(Request $request): JsonResponse
    {
        $request->validate([
            'slide' => 'required|file|mimes:jpg,jpeg,png,gif,bmp,webp,pdf,pptx,ppt|max:51200',
        ]);

        $file = $request->file('slide');
        $ext = strtolower($file->getClientOriginalExtension());
        $slidesDir = public_path('slides');

        if (!File::isDirectory($slidesDir)) {
            File::makeDirectory($slidesDir, 0755, true);
        }

        // PowerPoint: convertir a imágenes PNG
        if (in_array($ext, ['pptx', 'ppt'])) {
            return $this->convertPptxToImages($file, $slidesDir);
        }

        $name = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
        $file->move($slidesDir, $name);

        return response()->json([
            'success' => true,
            'filename' => $name,
            'url' => '/slides/' . $name,
        ]);
    }

    /**
     * Convertir PPTX/PPT a imágenes PNG usando PowerPoint COM vía PowerShell
     */
    private function convertPptxToImages($file, string $slidesDir): JsonResponse
    {
        $timestamp = time();
        $baseName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $tempName = $timestamp . '_temp.' . $file->getClientOriginalExtension();
        $file->move($slidesDir, $tempName);
        $tempPath = str_replace('/', '\\', $slidesDir . '\\' . $tempName);
        $exportDir = str_replace('/', '\\', $slidesDir . '\\' . $timestamp . '_export');
        $scriptPath = str_replace('/', '\\', base_path('scripts\\convert-pptx.ps1'));

        $cmd = sprintf(
            'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File %s -InputPath %s -OutputDir %s 2>&1',
            escapeshellarg($scriptPath),
            escapeshellarg($tempPath),
            escapeshellarg($exportDir)
        );

        $output = [];
        $exitCode = -1;
        exec($cmd, $output, $exitCode);

        // Limpiar archivo temporal PPTX
        if (file_exists($tempPath)) {
            @unlink($tempPath);
        }

        if ($exitCode !== 0) {
            if (is_dir($exportDir)) {
                $this->removeDir($exportDir);
            }
            return response()->json([
                'success' => false,
                'error' => 'No se pudo convertir el PowerPoint. Exporte las diapositivas como imágenes PNG desde PowerPoint (Archivo → Guardar como → PNG) y súbalas.',
            ], 422);
        }

        // Buscar PNGs generados con orden natural
        $pngFiles = [];
        $this->findPngs($exportDir, $pngFiles);
        natcasesort($pngFiles);
        $pngFiles = array_values($pngFiles);

        if (empty($pngFiles)) {
            if (is_dir($exportDir)) {
                $this->removeDir($exportDir);
            }
            return response()->json([
                'success' => false,
                'error' => 'La conversión no generó imágenes. Exporte las diapositivas como PNG desde PowerPoint.',
            ], 422);
        }

        $firstUrl = '';
        foreach ($pngFiles as $i => $pngPath) {
            $slideName = $timestamp . '_' . $baseName . '_slide_' . str_pad($i + 1, 3, '0', STR_PAD_LEFT) . '.png';
            rename($pngPath, $slidesDir . DIRECTORY_SEPARATOR . $slideName);
            if ($i === 0) {
                $firstUrl = '/slides/' . $slideName;
            }
        }

        // Limpiar directorio de export
        if (is_dir($exportDir)) {
            $this->removeDir($exportDir);
        }

        return response()->json([
            'success' => true,
            'filename' => $baseName,
            'url' => $firstUrl,
            'total' => count($pngFiles),
        ]);
    }

    private function findPngs(string $dir, array &$results): void
    {
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                $this->findPngs($path, $results);
            } elseif (preg_match('/\.png$/i', $item)) {
                $results[] = $path;
            }
        }
    }

    private function removeDir(string $dir): void
    {
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            is_dir($path) ? $this->removeDir($path) : unlink($path);
        }
        rmdir($dir);
    }

    /**
     * Eliminar diapositiva
     */
    public function deleteSlide(string $filename): JsonResponse
    {
        $safeName = basename($filename);
        $path = public_path('slides/' . $safeName);

        if (File::exists($path)) {
            File::delete($path);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Listar diapositivas subidas
     */
    public function listSlides(): JsonResponse
    {
        $dir = public_path('slides');
        $files = [];

        if (File::isDirectory($dir)) {
            foreach (File::files($dir) as $file) {
                $files[] = [
                    'filename' => $file->getFilename(),
                    'url' => '/slides/' . $file->getFilename(),
                    'size' => $file->getSize(),
                ];
            }
        }

        return response()->json($files);
    }

    public function overlay()
    {
        return view('overlay');
    }

    /**
     * Vista del panel de control
     */
    public function control()
    {
        return view('control');
    }
}
