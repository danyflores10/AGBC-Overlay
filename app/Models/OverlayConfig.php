<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OverlayConfig extends Model
{
    protected $fillable = ['config'];

    protected $casts = [
        'config' => 'array',
    ];

    /**
     * Obtener la configuración activa (siempre usamos el registro ID=1)
     */
    public static function active(): self
    {
        return self::firstOrCreate(['id' => 1], ['config' => self::defaults()]);
    }

    /**
     * Valores por defecto del overlay
     */
    public static function defaults(): array
    {
        return [
            // Textos principales
            'titulo_evento' => 'RENDICIÓN PÚBLICA DE CUENTAS FINAL 2025',
            'texto_principal' => 'RENDICIÓN PÚBLICA DE CUENTAS FINAL 2025',
            'texto_secundario' => 'En Correos de Bolivia, la eficiencia es nuestra prioridad',
            'nombre_expositor' => 'Correos de Bolivia',
            'cargo_expositor' => 'Dirección General Ejecutiva',
            'texto_ticker' => 'Bienvenidos a la transmisión oficial de la Agencia Boliviana de Correos — Síguenos en nuestras redes sociales — www.correosbolivia.gob.bo',

            // Pantalla de bienvenida
            'bienvenida_titulo' => 'En breve comenzamos',
            'bienvenida_evento' => 'Correos de Bolivia',
            'bienvenida_subtitulo' => 'Transmisión Institucional en Vivo',
            'countdown_minutos' => 5,

            // Pantalla de receso
            'receso_titulo' => 'Estamos en receso',
            'receso_subtitulo' => 'Volvemos en breve',
            'receso_minutos' => 10,

            // Pantalla de cierre
            'cierre_titulo' => 'Gracias por acompañarnos',
            'cierre_redes' => 'Facebook: /CorreosBolivia | Twitter: @CorreosBol | www.correosbolivia.gob.bo',

            // Diapositivas
            'slide_actual' => '',
            'slide_camara_device_id' => '',

            // Visibilidad de módulos
            'mostrar_lower_third' => true,
            'mostrar_barra_superior' => true,
            'mostrar_ticker' => true,
            'mostrar_reloj' => true,
            'mostrar_en_vivo' => true,
            'mostrar_camara' => true,
            'mostrar_logo' => false,

            // Layout activo: bienvenida, camara_full, diapositivas, lower_third, receso, cierre
            'layout_activo' => 'bienvenida',

            // Posición cámara: derecha_abajo, izquierda, grande
            'posicion_camara' => 'derecha_abajo',

            // ID de dispositivo de cámara seleccionado
            'camara_device_id' => '',

            // Segunda cámara y transición
            'camara2_device_id' => '',
            'camara_activa' => 1, // 1 o 2 — cuál está al aire
        ];
    }
}
