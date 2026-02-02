# desafio2RTVE



## Fuentes de datos
Municipios españa https://centrodedescargas.cnig.es
Creación geoJSON de la comunidad valenciana https://mapshaper.org/


```
$ -filter 'CODNUT2 == "ES52"'
[filter] Retained 542 of 8,132 features
$ -simplify 15%
[simplify] Repaired 21 intersections
$ -clean
[clean] Retained 540 of 542 features
$ -o format=geojson municipios_cv_simplificado.geojson
```

## Fuente de Datos Meteorológicos

**Organismo:** Agencia Estatal de Meteorología (AEMET)
**Plataforma:** OpenData AEMET (https://opendata.aemet.es/)
**Tipo de datos:** Valores climatológicos diarios
**Parámetro:** Precipitación acumulada (mm)
**Periodo:** 19 de octubre de 2024
**Ámbito:** Comunidad Valenciana
**Número de estaciones:** 34
**Fecha de descarga:** [FECHA DE HOY]

**Endpoint API utilizado:**
/api/valores/climatologicos/diarios/datos/fechaini/2024-10-19/fechafin/2024-10-19/todasestaciones

**Licencia:** Los datos se ofrecen bajo licencia abierta, compatible con CC-BY 4.0
**Atribución requerida:** "© AEMET. Es necesario publicar la autoría."