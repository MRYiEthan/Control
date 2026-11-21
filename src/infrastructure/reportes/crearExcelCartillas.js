import { strToU8, zipSync } from 'fflate'

const hoja = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const relaciones = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const paquete = 'http://schemas.openxmlformats.org/package/2006/relationships'
const tipo = 'application/vnd.openxmlformats-officedocument.spreadsheetml'
const columnas = ['Número de cartilla', 'Responsable del pago', 'Estado de pago']

// Las cadenas en línea conservan los ceros iniciales y los nombres que empiezan con "=".
function texto(valor) {
  return String(valor)
    .replace(/_x[0-9a-f]{4}_/gi, valor => '_x005F_' + valor.slice(1))
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function fila(numero, valores) {
  const celdas = valores.map((valor, i) => {
    const referencia = ['A', 'B', 'C'][i] + numero
    return `<c r="${referencia}" t="inlineStr"><is><t xml:space="preserve">${texto(valor)}</t></is></c>`
  })
  return `<row r="${numero}">${celdas.join('')}</row>`
}

function relacion(destino, clase) {
  return `<Relationships xmlns="${paquete}"><Relationship Id="rId1"
    Type="${relaciones}/${clase}" Target="${destino}"/></Relationships>`
}

export function crearExcelCartillas(inventario) {
  const rango = `A1:C${inventario.length + 1}`
  const filas = inventario.map(({ codigo, pago, estado }, i) =>
    fila(i + 2, [codigo, pago ? (pago.responsable || 'Sin registrar') : '', estado]))
  const archivos = {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="${tipo}.sheet.main+xml"/>
      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="${tipo}.worksheet+xml"/>
      <Override PartName="/xl/tables/table1.xml" ContentType="${tipo}.table+xml"/>
    </Types>`,
    '_rels/.rels': relacion('xl/workbook.xml', 'officeDocument'),
    'xl/workbook.xml': `<workbook xmlns="${hoja}" xmlns:r="${relaciones}">
      <sheets><sheet name="Cartillas" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': relacion('worksheets/sheet1.xml', 'worksheet'),
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${hoja}" xmlns:r="${relaciones}">
      <dimension ref="${rango}"/>
      <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2"
        activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
      <cols><col min="1" max="1" width="22" customWidth="1"/>
        <col min="2" max="2" width="38" customWidth="1"/>
        <col min="3" max="3" width="20" customWidth="1"/></cols>
      <sheetData>${fila(1, columnas)}${filas.join('')}</sheetData>
      <tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`,
    'xl/worksheets/_rels/sheet1.xml.rels': relacion('../tables/table1.xml', 'table'),
    'xl/tables/table1.xml': `<table xmlns="${hoja}" id="1" name="Cartillas" displayName="Cartillas"
      ref="${rango}" totalsRowShown="0"><autoFilter ref="${rango}"/>
      <tableColumns count="3">${columnas.map((nombre, i) =>
        `<tableColumn id="${i + 1}" name="${nombre}"/>`).join('')}</tableColumns>
      <tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0"
        showRowStripes="1" showColumnStripes="0"/></table>`,
  }
  const partes = Object.fromEntries(Object.entries(archivos).map(([ruta, xml]) => [ruta, strToU8(xml)]))
  return new Blob([zipSync(partes, { level: 1 })], { type: tipo + '.sheet' })
}
