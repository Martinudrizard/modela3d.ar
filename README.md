# Modela3D.ar - Tienda Web (MVP)

Esta es una primera version de la web para vender productos de impresion 3D.

## Incluye

- Vista Tienda para clientes.
- Vista Admin para cargar productos con:
  - una o mas fotos,
  - descripcion,
  - categoria,
  - precio.
- Carrito con cantidades.
- Checkout por WhatsApp con mensaje automatico y total.
- Diseño responsive (mobile first) para usar desde celular.

## Importante sobre almacenamiento

- El carrito sigue siendo local por dispositivo.
- Productos, carrusel y numero de WhatsApp ahora se sincronizan en Netlify mediante Functions + Blobs.
- Si abres el sitio publicado en Netlify, lo que cargues desde el celular quedara disponible tambien en otros dispositivos.
- Si abres `index.html` directo como archivo local, funciona en modo local sin nube.

## Probar local

Abri `index.html` directamente o usa un servidor simple:

- con Node: `npx serve .`

## Deploy en Netlify

1. Crea un repo con estos archivos.
2. En Netlify: Add new site > Import from Git.
3. Build command: vacio.
4. Publish directory: `.`
5. Deploy.
6. En Site settings > Functions verifica que use `netlify/functions`.
7. Abre la URL de Netlify desde tu celular para cargar fotos de galeria.

## Proteger panel Admin

Para que solo vos puedas usar acciones de Admin en la nube:

1. En Netlify, agrega una variable de entorno del sitio:
  - `ADMIN_PANEL_KEY` = tu clave privada
2. Redeploy del sitio.
3. Al entrar a Admin, la web pedira esa clave.

Sin esa clave, no se podran publicar ni sincronizar cambios en la nube.

## Carga de fotos desde celular

- En Admin > Nuevo producto puedes seleccionar 1 o mas fotos.
- Las imagenes se comprimen automaticamente antes de guardar para mejorar rendimiento movil.
- Veras vista previa antes de publicar.

## Proxima etapa sugerida

- Login admin protegido.
- Persistencia en base de datos.
- Stock por producto.
- Pagos y envios integrados.
