# desafio2RTVE
# DANA Valencia: Analisis Meteorologico Interactivo (Octubre 2024)

Este proyecto presenta una visualización de datos detallada sobre el episodio meteorológico extremo ocurrido el 29 de octubre de 2024 en la provincia de Valencia. Utiliza una narrativa de scrollytelling para guiar al usuario a través de la cronología, la intensidad de las precipitaciones y el impacto geográfico del evento.

## Caracteristicas Tecnicas

* **Navegacion Narrativa:** Implementación de secciones con scroll-snap para una lectura fluida y dirigida.
* **Cartografia Dual:**
    * **Modo Coropletas:** Representación municipal de los acumulados de lluvia.
    * **Modo Intensidad (Heatmap):** Renderizado basado en Canvas API para visualizar isoyetas de forma continua, superando las limitaciones de los límites administrativos.
* **Analisis de Datos Dinamico:** Gráficos interactivos que comparan la intensidad horaria (mm/h) frente al acumulado total (mm).
* **Comparador Visual:** Slider interactivo para observar el cambio en el territorio mediante imágenes satelitales antes y después del evento.

## Preparacion de Datos y Pipeline ETL

El proyecto se sustenta en una integración de datos cartográficos y meteorológicos mediante un proceso de optimización y unión (join).

### 1. Optimizacion Cartografica
La base geográfica proviene del Centro de Descargas del CNIG (IGN). Para asegurar un rendimiento fluido en dispositivos web, se procesó el GeoJSON original mediante Mapshaper:

```bash
# Filtrado por codigo de region, simplificacion al 15% y limpieza de topologia
$ mapshaper municipios_es.json \
    -filter 'CODNUT2 == "ES52"' \
    -simplify 15% \
    -clean \
    -o format=geojson municipios_cv_simplificado.geojson

    ### 2. Integracion de Datos (Data Merging)
Tras la simplificación geométrica, se desarrolló un script de procesamiento para unir la cartografía con los registros meteorológicos:

* **Fuente de Clima:** Datos de precipitación diaria y horaria obtenidos de la red AVAMET y AEMET.
* **Proceso de Union:** El script vincula los códigos de municipio del GeoJSON con los valores meteorológicos, normalizando nombres y resolviendo inconsistencias de identificación.
* **Resultado:** Un archivo único enriquecido (`municipios_con_meteo.geojson`) que permite una carga de datos eficiente sin procesos de unión en tiempo real en el cliente.



## Fuentes de Datos

* **Cartografia:** Municipios de España ([Centro de Descargas del CNIG](https://centrodedescargas.cnig.es)).
* **Meteorologia:** Agencia Estatal de Meteorología (AEMET) y Asociación Valenciana de Meteorología (AVAMET).
* **Temperatura del Mar:** CEAM, AEMET y Copernicus Marine Service.
* **Imagenes Satelitales:** NASA Landsat / Sentinel-2.

## Stack Tecnologico

* **Lenguajes:** HTML5, CSS3 (Scroll Snap, Viewport Units), JavaScript Vanilla (ES6+).
* **Librerias de Visualizacion:** Leaflet.js para mapas y Chart.js para el análisis estadístico.
* **Procesamiento de Geometrias:** Mapshaper.

## Autor

**David Delgado Pacheco** - Proyecto desarrollado para el Desafio de Visualizacion RTVE 2024.