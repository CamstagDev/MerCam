// Respaldo: como todo vive en el teléfono o el navegador, desde aquí se
// descarga una copia de los datos, se restaura, y se importan los datos de
// Cambasket (el archivo que deja `npm run importar:cambasket`).

import { cambiar, leer, reemplazar, type Datos } from '../datos/almacen.ts';
import { sumarImportacion, type ImportacionCambasket } from '../logica/importarCambasket.ts';
import { navegar, type Pantalla } from '../router.ts';
import { boton, el } from '../ui/dom.ts';

function descargar(nombre: string, texto: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importar(texto: string): string {
  const leido = JSON.parse(texto) as Partial<ImportacionCambasket> & Partial<Datos>;
  if (leido.formato === 'mercam-importacion') {
    cambiar((d) => sumarImportacion(d, leido as ImportacionCambasket));
    return `Importado de ${leido.origen ?? 'otro lado'}: ${leido.despensas?.length ?? 0} despensas, ${leido.articulos?.length ?? 0} productos, ${leido.planes?.length ?? 0} planes.`;
  }
  if (typeof leido.version === 'number' && Array.isArray(leido.listas)) {
    if (!confirm('Esto reemplaza TODOS los datos de MerCam en este dispositivo por los del respaldo. ¿Seguir?')) return 'No se cambió nada.';
    reemplazar(leido as Datos);
    return 'Respaldo restaurado.';
  }
  throw new Error('El archivo no es un respaldo de MerCam ni una importación de Cambasket.');
}

export const pantallaRespaldo: Pantalla = {
  titulo: 'Respaldo e importar',
  volverA: 'inicio',
  render(contenedor) {
    const estado = el('p', { class: 'ayuda' });
    const archivo = el('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Archivo a importar' });
    archivo.addEventListener('change', async () => {
      const elegido = archivo.files?.[0];
      if (!elegido) return;
      try {
        estado.textContent = importar(await elegido.text());
      } catch (error) {
        estado.textContent = `No se pudo importar: ${error instanceof Error ? error.message : error}`;
      }
      archivo.value = '';
    });
    const texto = el('textarea', { rows: '4', placeholder: 'O pega aquí el contenido del archivo', 'aria-label': 'Contenido a importar' });

    const d = leer();
    contenedor.append(
      el('h2', {}, 'Descargar una copia'),
      el(
        'p',
        { class: 'ayuda' },
        `Tus datos viven solo en este dispositivo: ${d.listas.length} listas, ${d.sitios.length} sitios, ${d.despensas.length} despensas, ${d.articulos.length} productos, ${d.planes.length} planes y ${Object.keys(d.historial).length} historiales de precios.`,
      ),
      boton('⬇ Descargar respaldo', () => descargar(`mercam-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(leer()))),

      el('h2', {}, 'Importar'),
      el(
        'p',
        { class: 'ayuda' },
        'Un respaldo de MerCam (reemplaza todo) o los datos de Cambasket: en la carpeta de MerCam corre ',
        el('code', {}, 'npm run importar:cambasket -- tu@correo.com'),
        ' y elige el archivo cambasket-a-mercam.json que deja. Importar Cambasket suma sus despensas, productos, compras y planes a lo que ya tienes; importarlo dos veces no duplica nada.',
      ),
      archivo,
      texto,
      boton('Importar lo pegado', () => {
        try {
          estado.textContent = importar(texto.value);
          texto.value = '';
        } catch (error) {
          estado.textContent = `No se pudo importar: ${error instanceof Error ? error.message : error}`;
        }
      }, 'secundario'),
      estado,
      el('p', {}, boton('Volver al inicio', () => navegar('inicio'), 'enlace')),
    );
  },
};
