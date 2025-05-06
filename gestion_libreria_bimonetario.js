// ---- USUARIO Y SESIÓN ----
let usuario = localStorage.getItem('usuarioLibreria') || "";
function pedirUsuario() {
    if (!usuario) {
        usuario = prompt("Ingrese su nombre o usuario para registrar cambios:", "");
        if (!usuario || !usuario.trim()) {
            alert("Debe ingresar un usuario para continuar.");
            pedirUsuario();
            return;
        }
        usuario = usuario.trim();
        localStorage.setItem('usuarioLibreria', usuario);
    }
    document.getElementById('usuarioBar').innerHTML = `Usuario: <b>${usuario}</b> <button onclick="cerrarSesionUsuario()" title="Cambiar usuario" style="font-size:12px;padding:2px 8px;margin-left:8px;">Salir</button>`;
}
function cerrarSesionUsuario() {
    localStorage.removeItem('usuarioLibreria');
    location.reload();
}
window.onload = pedirUsuario;

// ---- UTILIDADES ----
function getLS(key, def=[]) { return JSON.parse(localStorage.getItem(key)) || def; }
function setLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function round2(n) { return Math.round(n*100)/100; }
function soloFecha(fechaIso) { return fechaIso.split('T')[0]; }
function nowISO() { return new Date().toISOString(); }
function hoyISO() { return new Date().toISOString().slice(0,10); }
function mostrarMsg(id, txt, error=false) {
    const div = document.getElementById(id);
    div.innerHTML = `<div class="msg ${error?'msg-error':'msg-ok'}">${txt}</div>`;
    setTimeout(()=>{div.innerHTML='';}, 3000);
}
function formatearTodo() {
    if(confirm("¿Seguro que desea borrar todos los datos? Esto no se puede deshacer.")) {
        localStorage.clear();
        location.reload();
    }
}
// Setea la fecha de hoy en los campos date, si están vacíos
function setHoy(id) {
    let f = document.getElementById(id);
    if(f && !f.value) f.value = hoyISO();
}

// ---- CATEGORÍAS GASTO DINÁMICAS ----
let categoriasGasto = getLS('categoriasGasto', [
    "Alquiler", "Servicios", "Luz", "Agua", "Gastos bancarios", "Mano de Obra", "Materia Prima", "Otros"
]);
function guardarCategoriasGasto() { setLS('categoriasGasto', categoriasGasto); }
function cargarCategoriasGasto() {
    let sel = document.getElementById('categoriaGasto');
    if(!sel) return;
    sel.innerHTML = '';
    categoriasGasto.forEach(cat=>{
        sel.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}
function agregarCategoriaGasto() {
    let nueva = document.getElementById('nuevaCategoriaGasto').value.trim();
    if(nueva && !categoriasGasto.includes(nueva)) {
        categoriasGasto.push(nueva);
        guardarCategoriasGasto();
        cargarCategoriasGasto();
        document.getElementById('nuevaCategoriaGasto').value = '';
        mostrarMsg('msgGastos', 'Categoría agregada.');
    }
}

// ---- COTIZACIONES DÓLAR ----
let cotizaciones = getLS('cotizaciones', []);
function parseCotizaciones(texto) {
    let lines = texto.split('\n').map(l=>l.trim()).filter(Boolean);
    let arr = [];
    for(let l of lines) {
        let [fecha, compra, venta] = l.replace(',', '.').split(/\s+/);
        if (!fecha || !compra || !venta) continue;
        let [d, m, y] = fecha.split('/');
        arr.push({
            fecha: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`,
            compra: parseFloat(compra.replace(',','.')),
            venta: parseFloat(venta.replace(',','.'))
        });
    }
    arr = arr.sort((a,b)=>b.fecha.localeCompare(a.fecha));
    return arr;
}
function guardarCotizaciones(arr) {
    cotizaciones = arr;
    setLS('cotizaciones', cotizaciones);
}
function mostrarCotizaciones() {
    let tb = document.getElementById('tablaDolar');
    if (!tb) return;
    tb.innerHTML = '';
    cotizaciones.forEach((c,i)=>{
        tb.innerHTML += `<tr>
            <td>${c.fecha.split('-').reverse().join('/')}</td>
            <td>${c.compra}</td>
            <td>${c.venta}</td>
            <td><button onclick="eliminarCotizacion(${i})">Eliminar</button></td>
        </tr>`;
    });
}
window.eliminarCotizacion = function(i) {
    cotizaciones.splice(i,1);
    guardarCotizaciones(cotizaciones);
    mostrarCotizaciones();
};
let formDolar = document.getElementById('formCargaDolar');
if(formDolar) formDolar.onsubmit = function(e){
    e.preventDefault();
    let texto = document.getElementById('textoDolar').value;
    let nuevas = parseCotizaciones(texto);
    if(nuevas.length === 0) {
        mostrarMsg('msgDolar', "No se detectaron cotizaciones válidas.", true); return;
    }
    let fechasExistentes = new Set(cotizaciones.map(c=>c.fecha));
    let unidas = [...nuevas.filter(nc=>!fechasExistentes.has(nc.fecha)), ...cotizaciones];
    guardarCotizaciones(unidas.sort((a,b)=>b.fecha.localeCompare(a.fecha)));
    mostrarCotizaciones();
    mostrarMsg('msgDolar', '¡Cotizaciones cargadas!');
    this.reset();
};
function buscarCotizacion(fecha, tipo='venta') {
    if(!cotizaciones.length) return 1;
    let arr = cotizaciones.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
    for(let i=0; i<arr.length; i++) {
        if(arr[i].fecha <= fecha) return arr[i][tipo];
    }
    return arr[arr.length-1][tipo];
}
function montoEnDolares(monto, fecha, tipo) {
    let cotiz = buscarCotizacion(fecha, tipo);
    return cotiz ? round2(monto/cotiz) : 0;
}

// ---- DATOS ----
let productos      = getLS('productos');
let compras        = getLS('compras');
let ventas         = getLS('ventas');
let clientes       = getLS('clientes');
let proveedores    = getLS('proveedores');
let gastos         = getLS('gastos');
let libroDiario    = getLS('libroDiario');
let libroMayor     = getLS('libroMayor', {});
let pagosCC        = getLS('pagosCC', []);
let auditoria      = getLS('auditoria', []);

const cuentas = [
    'Caja', 'Bancos', 'Cuentas por cobrar', 'Inventarios', 'Mobiliario y equipo',
    'IVA Crédito Fiscal', 'Proveedores', 'Cuentas por pagar', 'Préstamos',
    'IVA Débito Fiscal', 'Capital Social', 'Resultados acumulados',
    'Ingresos por ventas', 'Gastos operativos', 'Costos de ventas', 'Impuestos',
    'Descuentos por ventas'
];

// ---- NAVEGACIÓN ----
document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(link.dataset.section).classList.add('active');
        recargarTablas();
        setHoy('fechaCompra');
        setHoy('fechaVenta');
        setHoy('fechaGasto');
        setHoy('fechaPagoCC');
    });
});
function recargarTablas() {
    mostrarProductos();
    mostrarCompras();
    mostrarVentas();
    mostrarClientes();
    mostrarProveedores();
    mostrarGastos();
    cargarSelects();
    cargarCategoriasGasto();
    mostrarLibroDiario();
    mostrarLibroMayor();
    mostrarCuentaCorriente();
    mostrarPagosCC();
    mostrarIndicadoresGestion();
    mostrarCotizaciones();
    setHoy('fechaCompra');
    setHoy('fechaVenta');
    setHoy('fechaGasto');
    setHoy('fechaPagoCC');
}

// ---- AUDITORÍA ----
function registrarAuditoria(tipo, accion, id, datosAntes, datosDespues) {
    auditoria.push({
        tipo, accion, id,
        usuario,
        fecha: nowISO(),
        antes: datosAntes || null,
        despues: datosDespues || null
    });
    setLS('auditoria', auditoria);
}
function mostrarHistorialEdicion(item) {
    if (!item || !item.historial || !item.historial.length) return '';
    const h = item.historial[item.historial.length-1];
    return `<p class="historial-edicion">Editado por ${h.usuario} el ${h.fecha.split('T')[0]}</p>`;
}

// ---- REVERSIÓN DEL MAYOR ----
function revertirLibroMayorDeAsientos(asientos) {
    asientos.forEach(a => {
        if(!libroMayor[a.cuenta]) libroMayor[a.cuenta]=0;
        libroMayor[a.cuenta] -= (a.debe || 0);
        libroMayor[a.cuenta] += (a.haber || 0);
    });
    setLS('libroMayor', libroMayor);
}

// ---- ELIMINAR ASIENTOS Y IMPACTAR MAYOR ----
function eliminarAsientosPorOperacion(tipo, operacion) {
    let desc = (tipo==="compra")
        ? `Compra de ${operacion.cantidad} ${operacion.producto} a ${operacion.proveedor}`
        : (tipo==="venta")
            ? `Venta de ${operacion.cantidad} ${operacion.producto} a ${operacion.cliente} (${operacion.tipoPago})`
        : (tipo==="gasto")
            ? `Gasto: ${operacion.categoria} a ${operacion.proveedor}${operacion.detalle?' ('+operacion.detalle+')':''}`
        : (tipo==="pagoCC")
            ? (operacion.tipo === "cliente"
                ? `Pago cuenta corriente de cliente: ${operacion.nombre}`
                : `Pago cuenta corriente a proveedor: ${operacion.nombre}`)
        : "";
    let asientos = libroDiario.filter(l =>
        l.fecha === operacion.fecha && l.descripcion === desc
    );
    revertirLibroMayorDeAsientos(asientos);
    libroDiario = libroDiario.filter(l =>
        !(l.fecha === operacion.fecha && l.descripcion === desc)
    );
    setLS('libroDiario', libroDiario);
}

// ---- PRODUCTOS ----
document.getElementById('formAgregarProducto').onsubmit = function(e) {
    e.preventDefault();
    const nombre = document.getElementById('nombreProducto').value.trim();
    const precioCompra = parseFloat(document.getElementById('precioCompra').value);
    const precioVenta = parseFloat(document.getElementById('precioVenta').value);
    const iva = parseFloat(document.getElementById('ivaProducto').value);
    const stockMin = parseInt(document.getElementById('stockMin').value) || 0;
    if (!nombre || isNaN(precioCompra) || isNaN(precioVenta) || isNaN(iva)) return;
    let idx = productos.findIndex(p => p.nombre===nombre);
    if(idx >=0){
        mostrarMsg('msgProductos', 'El producto ya existe.', true);
        return;
    }
    productos.push({nombre, precioCompra, precioVenta, iva, stockMin, stock:0});
    setLS('productos', productos);
    this.reset();
    mostrarMsg('msgProductos', 'Producto agregado correctamente.');
    mostrarProductos();
    cargarSelects();
};
function mostrarProductos() {
    const tb = document.getElementById('tablaProductos');
    if (!tb) return;
    tb.innerHTML = '';
    productos.forEach((prod, i) => {
        const margen = prod.precioCompra > 0 ? round2((prod.precioVenta-prod.precioCompra)*100/prod.precioCompra) : 0;
        tb.innerHTML += `<tr>
            <td>${prod.nombre}</td>
            <td>${prod.precioCompra ? prod.precioCompra.toFixed(2) : '-'}</td>
            <td>${prod.precioVenta.toFixed(2)}</td>
            <td>${(prod.iva*100).toFixed(1)}%</td>
            <td>${prod.precioCompra > 0 ? margen + '%' : '-'}</td>
            <td>${prod.stock}${prod.stock<=prod.stockMin?'<span class="alerta-stock">¡Bajo!</span>':''}</td>
            <td>${prod.stockMin||0}</td>
            <td>
                <button class="b-action" onclick="editarProducto(${i})">Editar</button>
                <button class="b-action" onclick="eliminarProducto(${i})">Eliminar</button>
            </td>
        </tr>`;
    });
}
window.eliminarProducto = function(i){
    productos.splice(i,1);
    setLS('productos', productos);
    mostrarProductos();
    cargarSelects();
};
window.editarProducto = function(i){
    const p = productos[i];
    if(!p) return;
    document.getElementById('nombreProducto').value = p.nombre;
    document.getElementById('precioCompra').value = p.precioCompra;
    document.getElementById('precioVenta').value = p.precioVenta;
    document.getElementById('ivaProducto').value = p.iva;
    document.getElementById('stockMin').value = p.stockMin;
    eliminarProducto(i);
};

// ---- COMPRAS ----
let editCompraIdx = null;
document.getElementById('formRegistrarCompra').onsubmit = function(e){
    e.preventDefault();
    const producto = document.getElementById('productoCompra').value;
    const cantidad = parseInt(document.getElementById('cantidadCompra').value);
    const precioCompraUnitario = parseFloat(document.getElementById('precioCompraUnitario').value);
    const iva = parseFloat(document.getElementById('ivaCompra').value);
    const proveedor = document.getElementById('proveedorCompra').value;
    const tipoPago = document.getElementById('tipoPagoCompra').value;
    let fecha = document.getElementById('fechaCompra').value
        ? document.getElementById('fechaCompra').value+'T00:00:00'
        : nowISO();

    let prod = productos.find(p=>p.nombre===producto);
    if(!prod) { mostrarMsg('msgCompras', "Debe dar de alta el producto primero.", true); return; }
    if(isNaN(cantidad) || cantidad<=0 || isNaN(precioCompraUnitario) || !proveedor) {
        mostrarMsg('msgCompras', "Datos incompletos o inválidos.", true); return;
    }
    const subtotal = precioCompraUnitario*cantidad;
    const ivaMonto = subtotal*iva;
    const total = subtotal + ivaMonto;
    let datosAntes = null;
    if(editCompraIdx !== null) {
        let oldCompra = compras[editCompraIdx];
        eliminarAsientosPorOperacion("compra", oldCompra);
        fecha = oldCompra.fecha;
        let prodOld = productos.find(p=>p.nombre===oldCompra.producto);
        if(prodOld) prodOld.stock -= oldCompra.cantidad;
        datosAntes = {...oldCompra};
        compras[editCompraIdx] = {
            fecha, producto, cantidad, precioCompraUnitario, iva, total, proveedor, tipoPago,
            historial: (oldCompra.historial||[]).concat([{usuario, fecha: nowISO()}])
        };
        registrarAuditoria('compra','editado',editCompraIdx,datosAntes,compras[editCompraIdx]);
        editCompraIdx = null;
    } else {
        compras.push({fecha, producto, cantidad, precioCompraUnitario, iva, total, proveedor, tipoPago, historial: [{usuario, fecha: nowISO()}]});
        registrarAuditoria('compra','creado',compras.length-1,null,compras[compras.length-1]);
    }
    prod.stock = (prod.stock||0) + cantidad;
    prod.precioCompra = precioCompraUnitario;
    prod.iva = iva;
    setLS('productos', productos);
    setLS('compras', compras);

    registrarLibroDiario({
        fecha,
        descripcion: `Compra de ${cantidad} ${producto} a ${proveedor}`,
        asientos: [
            {cuenta: 'Inventarios', debe: subtotal, haber: 0},
            {cuenta: 'IVA Crédito Fiscal', debe: ivaMonto, haber: 0},
            {cuenta: tipoPago==="Cuenta Corriente" ? 'Proveedores' : 'Caja', debe: 0, haber: total}
        ]
    });
    actualizarLibroMayor('Inventarios', subtotal);
    actualizarLibroMayor('IVA Crédito Fiscal', ivaMonto);
    actualizarLibroMayor(tipoPago==="Cuenta Corriente" ? 'Proveedores' : 'Caja', -total);

    mostrarProductos();
    mostrarCompras();
    mostrarLibroDiario();
    mostrarLibroMayor();
    cargarSelects();
    mostrarMsg('msgCompras', 'Compra registrada.');
    this.reset();
    setHoy('fechaCompra');
};
function mostrarCompras(){
    const tb = document.getElementById('tablaCompras');
    if (!tb) return;
    tb.innerHTML = '';
    compras.slice().reverse().forEach((c, idx)=>{
        let fecha = soloFecha(c.fecha);
        let cotiz = buscarCotizacion(fecha, 'compra');
        tb.innerHTML += `<tr>
            <td>${c.producto}</td>
            <td>${c.cantidad}</td>
            <td>${c.precioCompraUnitario.toFixed(2)}</td>
            <td>${(c.iva*100).toFixed(1)}%</td>
            <td>
              $${c.total.toFixed(2)}
              <br><span class="cotiz">USD ${montoEnDolares(c.total, fecha, 'compra')}</span>
            </td>
            <td>${c.proveedor}</td>
            <td>${c.tipoPago||'Pagada'}</td>
            <td>${fecha}</td>
            <td>
                <button class="b-action" onclick="editarCompra(${compras.length-1-idx})">Editar</button>
                <button class="b-action" onclick="eliminarCompra(${compras.length-1-idx})">Eliminar</button>
                ${mostrarHistorialEdicion(c)}
            </td>
        </tr>`;
    });
}
window.editarCompra = function(idx){
    const c = compras[idx];
    if(!c) return;
    document.getElementById('productoCompra').value = c.producto;
    document.getElementById('cantidadCompra').value = c.cantidad;
    document.getElementById('precioCompraUnitario').value = c.precioCompraUnitario;
    document.getElementById('ivaCompra').value = c.iva;
    document.getElementById('proveedorCompra').value = c.proveedor;
    document.getElementById('tipoPagoCompra').value = c.tipoPago || "Caja";
    document.getElementById('fechaCompra').value = c.fecha.split('T')[0];
    editCompraIdx = idx;
};
window.eliminarCompra = function(idx){
    const c = compras[idx];
    if(!c) return;
    let prod = productos.find(p=>p.nombre===c.producto);
    if(prod) prod.stock -= c.cantidad;
    eliminarAsientosPorOperacion("compra", c);
    registrarAuditoria('compra','borrado',idx,c,null);
    compras.splice(idx,1);
    setLS('compras', compras);
    setLS('productos', productos);
    mostrarCompras();
    mostrarProductos();
};

// ---- VENTAS ----
let editVentaIdx = null;
document.getElementById('formRegistrarVenta').onsubmit = function(e){
    e.preventDefault();
    const producto = document.getElementById('productoVenta').value;
    const cantidad = parseInt(document.getElementById('cantidadVenta').value);
    const descuentoPorc = parseFloat(document.getElementById('descuentoVenta').value) || 0;
    const tipoPago = document.getElementById('tipoPagoVenta').value;
    const iva = parseFloat(document.getElementById('ivaVenta').value);
    const cliente = document.getElementById('clienteVenta').value;
    let fecha = document.getElementById('fechaVenta').value
        ? document.getElementById('fechaVenta').value+'T00:00:00'
        : nowISO();
    let prod = productos.find(p=>p.nombre===producto);
    if(!prod) { mostrarMsg('msgVentas', "Elija un producto válido.", true); return; }
    if(isNaN(cantidad) || cantidad<=0 || !cliente) { mostrarMsg('msgVentas', "Datos incompletos o inválidos.", true); return; }
    if(prod.stock < cantidad){
        mostrarMsg('msgVentas', 'Stock insuficiente.', true); return;
    }
    const precioUnitario = prod.precioVenta;
    const subtotal = precioUnitario * cantidad;
    const descuento = subtotal * (descuentoPorc/100);
    const base = subtotal - descuento;
    const ivaMonto = base * iva/(1+iva);
    const total = base;
    let datosAntes = null;
    if(editVentaIdx !== null) {
        let oldVenta = ventas[editVentaIdx];
        eliminarAsientosPorOperacion("venta", oldVenta);
        fecha = oldVenta.fecha;
        let prodOld = productos.find(p=>p.nombre===oldVenta.producto);
        if(prodOld) prodOld.stock += oldVenta.cantidad;
        datosAntes = {...oldVenta};
        ventas[editVentaIdx] = {
            fecha, producto, cantidad, precioUnitario, descuento: descuentoPorc, iva, total, tipoPago, cliente,
            historial: (oldVenta.historial||[]).concat([{usuario, fecha: nowISO()}])
        };
        registrarAuditoria('venta','editado',editVentaIdx,datosAntes,ventas[editVentaIdx]);
        editVentaIdx = null;
    } else {
        ventas.push({fecha, producto, cantidad, precioUnitario, descuento: descuentoPorc, iva, total, tipoPago, cliente, historial: [{usuario, fecha: nowISO()}]});
        registrarAuditoria('venta','creado',ventas.length-1,null,ventas[ventas.length-1]);
    }
    prod.stock -= cantidad;
    setLS('ventas', ventas);
    setLS('productos', productos);

    let cuentaPago = (tipoPago==="Efectivo"||tipoPago==="Débito") ? "Caja"
                    : (tipoPago==="Transferencia"||tipoPago==="Bancos") ? "Bancos"
                    : (tipoPago==="Cuenta Corriente") ? "Cuentas por cobrar"
                    : "Caja";
    let costoVenta = (prod.precioCompra||0) * cantidad;
    let asientos = [
        {cuenta: cuentaPago, debe: total, haber: 0},
        {cuenta: 'Ingresos por ventas', debe: 0, haber: base-ivaMonto},
        {cuenta: 'IVA Débito Fiscal', debe: 0, haber: ivaMonto}
    ];
    if(descuentoPorc>0) asientos.push({cuenta: 'Descuentos por ventas', debe: descuento, haber: 0});
    if(costoVenta>0) {
        asientos.push({cuenta: 'Costos de ventas', debe: costoVenta, haber: 0});
        asientos.push({cuenta: 'Inventarios', debe: 0, haber: costoVenta});
    }
    registrarLibroDiario({
        fecha,
        descripcion: `Venta de ${cantidad} ${producto} a ${cliente} (${tipoPago})`,
        asientos
    });
    actualizarLibroMayor(cuentaPago, total);
    actualizarLibroMayor('Ingresos por ventas', -(base-ivaMonto));
    actualizarLibroMayor('IVA Débito Fiscal', -ivaMonto);
    if(descuentoPorc>0) actualizarLibroMayor('Descuentos por ventas', descuento);
    if(costoVenta>0) {
        actualizarLibroMayor('Costos de ventas', costoVenta);
        actualizarLibroMayor('Inventarios', -costoVenta);
    }

    mostrarProductos();
    mostrarVentas();
    mostrarLibroDiario();
    mostrarLibroMayor();
    cargarSelects();
    mostrarMsg('msgVentas', 'Venta registrada.');
    this.reset();
    setHoy('fechaVenta');
};
function mostrarVentas(){
    const tb = document.getElementById('tablaVentas');
    if (!tb) return;
    tb.innerHTML = '';
    ventas.slice().reverse().forEach((v, idx)=>{
        let fecha = soloFecha(v.fecha);
        let cotiz = buscarCotizacion(fecha, 'venta');
        tb.innerHTML += `<tr>
            <td>${v.producto}</td>
            <td>${v.cantidad}</td>
            <td>${v.precioUnitario.toFixed(2)}</td>
            <td>${v.descuento || 0}%</td>
            <td>${(v.iva*100).toFixed(1)}%</td>
            <td>
              $${v.total.toFixed(2)}
              <br><span class="cotiz">USD ${montoEnDolares(v.total, fecha, 'venta')}</span>
            </td>
            <td>${v.tipoPago}</td>
            <td>${v.cliente}</td>
            <td>${fecha}</td>
            <td>
                <button class="b-action" onclick="editarVenta(${ventas.length-1-idx})">Editar</button>
                <button class="b-action" onclick="eliminarVenta(${ventas.length-1-idx})">Eliminar</button>
                ${mostrarHistorialEdicion(v)}
            </td>
        </tr>`;
    });
}
window.editarVenta = function(idx){
    const v = ventas[idx];
    if(!v) return;
    document.getElementById('productoVenta').value = v.producto;
    document.getElementById('cantidadVenta').value = v.cantidad;
    document.getElementById('descuentoVenta').value = v.descuento || 0;
    document.getElementById('tipoPagoVenta').value = v.tipoPago;
    document.getElementById('ivaVenta').value = v.iva;
    document.getElementById('clienteVenta').value = v.cliente;
    document.getElementById('fechaVenta').value = v.fecha.split('T')[0];
    editVentaIdx = idx;
};
window.eliminarVenta = function(idx){
    const v = ventas[idx];
    if(!v) return;
    let prod = productos.find(p=>p.nombre===v.producto);
    if(prod) prod.stock += v.cantidad;
    eliminarAsientosPorOperacion("venta", v);
    registrarAuditoria('venta','borrado',idx,v,null);
    ventas.splice(idx,1);
    setLS('ventas', ventas);
    setLS('productos', productos);
    mostrarVentas();
    mostrarProductos();
};

// ---- GASTOS ----
let editGastoIdx = null;
document.getElementById('formRegistrarGasto').onsubmit = function(e){
    e.preventDefault();
    const categoria = document.getElementById('categoriaGasto').value;
    const proveedor = document.getElementById('proveedorGasto').value.trim();
    const monto = parseFloat(document.getElementById('montoGasto').value);
    const iva = parseFloat(document.getElementById('ivaGasto').value);
    const detalle = document.getElementById('detalleGasto').value.trim();
    let fecha = document.getElementById('fechaGasto').value
        ? document.getElementById('fechaGasto').value+'T00:00:00'
        : nowISO();
    if(!categoria || !proveedor || isNaN(monto) || isNaN(iva)) {
        mostrarMsg('msgGastos', 'Datos incompletos.', true); return;
    }
    const total = monto;
    let datosAntes = null;
    if(editGastoIdx !== null) {
        let oldGasto = gastos[editGastoIdx];
        eliminarAsientosPorOperacion("gasto", oldGasto);
        fecha = oldGasto.fecha;
        datosAntes = {...oldGasto};
        gastos[editGastoIdx] = {
            fecha, categoria, proveedor, monto, iva, total, detalle,
            historial: (oldGasto.historial||[]).concat([{usuario, fecha: nowISO()}])
        };
        registrarAuditoria('gasto','editado',editGastoIdx,datosAntes,gastos[editGastoIdx]);
        editGastoIdx = null;
    } else {
        gastos.push({fecha, categoria, proveedor, monto, iva, total, detalle, historial: [{usuario, fecha: nowISO()}]});
        registrarAuditoria('gasto','creado',gastos.length-1,null,gastos[gastos.length-1]);
    }
    setLS('gastos', gastos);
    registrarLibroDiario({
        fecha,
        descripcion: `Gasto: ${categoria} a ${proveedor}` + (detalle? ' ('+detalle+')':''),
        asientos: [
            {cuenta: categoria, debe: monto/(1+iva), haber: 0},
            {cuenta: 'IVA Crédito Fiscal', debe: monto-(monto/(1+iva)), haber: 0},
            {cuenta: 'Caja', debe: 0, haber: total},
        ]
    });
    actualizarLibroMayor(categoria, monto/(1+iva));
    actualizarLibroMayor('IVA Crédito Fiscal', monto-(monto/(1+iva)));
    actualizarLibroMayor('Caja', -total);
    this.reset();
    setHoy('fechaGasto');
    mostrarGastos();
    mostrarLibroDiario();
    mostrarLibroMayor();
    mostrarMsg('msgGastos', 'Gasto registrado.');
};
function mostrarGastos(){
    const tb = document.getElementById('tablaGastos');
    if (!tb) return;
    tb.innerHTML = '';
    gastos.slice().reverse().forEach((g, idx)=>{
        let fecha = soloFecha(g.fecha);
        tb.innerHTML += `<tr>
            <td>${fecha}</td>
            <td>${g.categoria}</td>
            <td>${g.proveedor}</td>
            <td>${g.monto.toFixed(2)}</td>
            <td>${(g.iva*100).toFixed(1)}%</td>
            <td>
              $${g.monto.toFixed(2)}
              <br><span class="cotiz">USD ${montoEnDolares(g.monto, fecha, 'compra')}</span>
            </td>
            <td>${g.detalle||''}</td>
            <td>
                <button class="b-action" onclick="editarGasto(${gastos.length-1-idx})">Editar</button>
                <button class="b-action" onclick="eliminarGasto(${gastos.length-1-idx})">Eliminar</button>
                ${mostrarHistorialEdicion(g)}
            </td>
        </tr>`;
    });
}
window.editarGasto = function(idx){
    const g = gastos[idx];
    if(!g) return;
    document.getElementById('categoriaGasto').value = g.categoria;
    document.getElementById('proveedorGasto').value = g.proveedor;
    document.getElementById('montoGasto').value = g.monto;
    document.getElementById('ivaGasto').value = g.iva;
    document.getElementById('detalleGasto').value = g.detalle;
    document.getElementById('fechaGasto').value = g.fecha.split('T')[0];
    editGastoIdx = idx;
};
window.eliminarGasto = function(idx){
    const g = gastos[idx];
    if(!g) return;
    eliminarAsientosPorOperacion("gasto", g);
    registrarAuditoria('gasto','borrado',idx,g,null);
    gastos.splice(idx,1);
    setLS('gastos', gastos);
    mostrarGastos();
};

// ---- CLIENTES ----
document.getElementById('formAgregarCliente').onsubmit = function(e){
    e.preventDefault();
    const nombre = document.getElementById('nombreCliente').value.trim();
    const cuit = document.getElementById('cuitCliente').value.trim();
    if(nombre && !clientes.some(c => c.nombre===nombre)){
        clientes.push({nombre, cuit});
        setLS('clientes', clientes);
        mostrarMsg('msgClientes', 'Cliente agregado.');
    } else {
        mostrarMsg('msgClientes', 'El cliente ya existe.', true);
    }
    this.reset();
    mostrarClientes();
    cargarSelects();
};
function mostrarClientes(){
    const tb = document.getElementById('tablaClientes');
    if (!tb) return;
    tb.innerHTML = '';
    clientes.forEach((c,i)=>{
        tb.innerHTML += `<tr>
            <td>${c.nombre}</td>
            <td>${c.cuit || ''}</td>
            <td>
                <button onclick="editarCliente(${i})">Editar</button>
                <button onclick="eliminarCliente(${i})">Eliminar</button>
            </td>
        </tr>`;
    });
}
window.eliminarCliente = function(i){
    clientes.splice(i,1);
    setLS('clientes', clientes);
    mostrarClientes();
    cargarSelects();
};
window.editarCliente = function(i){
    const c = clientes[i];
    if(!c) return;
    document.getElementById('nombreCliente').value = c.nombre;
    document.getElementById('cuitCliente').value = c.cuit || "";
    eliminarCliente(i);
};

// ---- PROVEEDORES ----
document.getElementById('formAgregarProveedor').onsubmit = function(e){
    e.preventDefault();
    const nombre = document.getElementById('nombreProveedor').value.trim();
    const cuit = document.getElementById('cuitProveedor').value.trim();
    if(nombre && !proveedores.some(p => p.nombre===nombre)){
        proveedores.push({nombre, cuit});
        setLS('proveedores', proveedores);
        mostrarMsg('msgProveedores', 'Proveedor agregado.');
    } else {
        mostrarMsg('msgProveedores', 'El proveedor ya existe.', true);
    }
    this.reset();
    mostrarProveedores();
    cargarSelects();
};
function mostrarProveedores(){
    const tb = document.getElementById('tablaProveedores');
    if (!tb) return;
    tb.innerHTML = '';
    proveedores.forEach((p,i)=>{
        tb.innerHTML += `<tr>
            <td>${p.nombre}</td>
            <td>${p.cuit || ''}</td>
            <td>
                <button onclick="editarProveedor(${i})">Editar</button>
                <button onclick="eliminarProveedor(${i})">Eliminar</button>
            </td>
        </tr>`;
    });
}
window.eliminarProveedor = function(i){
    proveedores.splice(i,1);
    setLS('proveedores', proveedores);
    mostrarProveedores();
    cargarSelects();
};
window.editarProveedor = function(i){
    const p = proveedores[i];
    if(!p) return;
    document.getElementById('nombreProveedor').value = p.nombre;
    document.getElementById('cuitProveedor').value = p.cuit || "";
    eliminarProveedor(i);
};

// ---- PAGOS CUENTA CORRIENTE ----
function registrarAsientoYMayorPagoCC(pago) {
    let fechaPago = pago.fecha;
    let montoPago = pago.monto;
    let descripcionPago = (pago.tipo==="cliente")
        ? `Pago cuenta corriente de cliente: ${pago.nombre}`
        : `Pago cuenta corriente a proveedor: ${pago.nombre}`;
    let asientosPago = (pago.tipo==="cliente")
        ? [
            {cuenta: "Caja", debe: montoPago, haber: 0},
            {cuenta: "Cuentas por cobrar", debe: 0, haber: montoPago}
          ]
        : [
            {cuenta: "Proveedores", debe: montoPago, haber: 0},
            {cuenta: "Caja", debe: 0, haber: montoPago}
          ];
    registrarLibroDiario({
        fecha: fechaPago,
        descripcion: descripcionPago,
        asientos: asientosPago
    });
    asientosPago.forEach(a=>{
        actualizarLibroMayor(a.cuenta, (a.debe || 0) - (a.haber || 0));
    });
}
document.getElementById('formRegistrarPagoCC').onsubmit = function(e){
    e.preventDefault();
    const tipo = document.getElementById('tipoPagoCC').value;
    const nombre = document.getElementById('nombrePagoCC').value;
    const monto = parseFloat(document.getElementById('montoPagoCC').value);
    let fecha = document.getElementById('fechaPagoCC').value
        ? document.getElementById('fechaPagoCC').value+'T00:00:00'
        : nowISO();
    if(!tipo || !nombre || isNaN(monto) || monto <= 0){
        mostrarMsg('msgPagosCC', 'Datos incompletos o inválidos.', true);
        return;
    }
    let pago = {
        tipo, nombre, monto, fecha, usuario
    };
    pagosCC.push(pago);
    setLS('pagosCC', pagosCC);
    registrarAsientoYMayorPagoCC(pago);
    mostrarMsg('msgPagosCC', 'Pago registrado.');
    mostrarPagosCC();
    mostrarCuentaCorriente();
    mostrarIndicadoresGestion();
    this.reset();
    setHoy('fechaPagoCC');
};
function mostrarPagosCC(){
    const tb = document.getElementById('tablaPagosCC');
    if (!tb) return;
    tb.innerHTML = '';
    pagosCC.slice().reverse().forEach((p, idx)=>{
        let fecha = soloFecha(p.fecha);
        tb.innerHTML += `<tr>
            <td>${p.tipo[0].toUpperCase()+p.tipo.slice(1)}</td>
            <td>${p.nombre}</td>
            <td>
              $${p.monto.toFixed(2)}
              <br><span class="cotiz">USD ${montoEnDolares(p.monto, fecha, p.tipo==='cliente'?'venta':'compra')}</span>
            </td>
            <td>${fecha}</td>
            <td>${p.usuario||''}</td>
            <td>
                <button class="b-action" onclick="eliminarPagoCC(${pagosCC.length-1-idx})">Eliminar</button>
            </td>
        </tr>`;
    });
}
window.eliminarPagoCC = function(idx){
    let pago = pagosCC[idx];
    eliminarAsientosPorOperacion("pagoCC", pago);
    pagosCC.splice(idx,1);
    setLS('pagosCC', pagosCC);
    mostrarPagosCC();
    mostrarCuentaCorriente();
    mostrarIndicadoresGestion();
};
// ---- ACTUALIZAR SELECT PAGO (Cliente/Proveedor) ----
document.getElementById('tipoPagoCC').onchange = function(){
    let tipo = this.value;
    let select = document.getElementById('nombrePagoCC');
    select.innerHTML = '<option value="">Seleccione</option>';
    if(tipo === "cliente") clientes.forEach(c => select.innerHTML += `<option value="${c.nombre}">${c.nombre}</option>`);
    if(tipo === "proveedor") proveedores.forEach(p => select.innerHTML += `<option value="${p.nombre}">${p.nombre}</option>`);
};

// ---- CUENTAS CORRIENTES ----
function mostrarCuentaCorriente(){
    // Clientes
    let html = '<table class="cc-table"><caption>Cuenta Corriente Clientes</caption><thead><tr><th>Cliente</th><th>CUIT</th><th>Saldo</th></tr></thead><tbody>';
    clientes.forEach(c=>{
        let saldo = 0;
        let saldoUsd = 0;
        ventas.forEach(v=>{
            if(v.cliente===c.nombre && v.tipoPago==="Cuenta Corriente") {
                saldo += v.total;
                saldoUsd += montoEnDolares(v.total, soloFecha(v.fecha), 'venta');
            }
        });
        pagosCC.forEach(p=>{
            if(p.tipo==="cliente" && p.nombre===c.nombre) {
                saldo -= p.monto;
                saldoUsd -= montoEnDolares(p.monto, soloFecha(p.fecha), 'venta');
            }
        });
        html += `<tr><td>${c.nombre}</td><td>${c.cuit||''}</td><td>$${saldo.toFixed(2)}<br><span class="cotiz">USD ${saldoUsd.toFixed(2)}</span></td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('ccClientes').innerHTML = html;

    // Proveedores
    html = '<table class="cc-table"><caption>Cuenta Corriente Proveedores</caption><thead><tr><th>Proveedor</th><th>CUIT</th><th>Saldo</th></tr></thead><tbody>';
    proveedores.forEach(p=>{
        let saldo = 0;
        let saldoUsd = 0;
        compras.forEach(c=>{
            if(c.proveedor===p.nombre && c.tipoPago==="Cuenta Corriente") {
                saldo += c.total;
                saldoUsd += montoEnDolares(c.total, soloFecha(c.fecha), 'compra');
            }
        });
        pagosCC.forEach(pg=>{
            if(pg.tipo==="proveedor" && pg.nombre===p.nombre) {
                saldo -= pg.monto;
                saldoUsd -= montoEnDolares(pg.monto, soloFecha(pg.fecha), 'compra');
            }
        });
        html += `<tr><td>${p.nombre}</td><td>${p.cuit||''}</td><td>$${saldo.toFixed(2)}<br><span class="cotiz">USD ${saldoUsd.toFixed(2)}</span></td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('ccProveedores').innerHTML = html;
}

// ---- SELECTS ----
function cargarSelects(){
    const selProdCompra = document.getElementById('productoCompra');
    if (selProdCompra) {
        selProdCompra.innerHTML = '<option value="">Seleccione un Producto</option>';
        productos.forEach(p=>{
            selProdCompra.innerHTML += `<option value="${p.nombre}">${p.nombre}</option>`;
        });
    }
    const selProdVenta = document.getElementById('productoVenta');
    if (selProdVenta) {
        selProdVenta.innerHTML = '<option value="">Seleccione un Producto</option>';
        productos.forEach(p=>{
            if(p.stock>0) selProdVenta.innerHTML += `<option value="${p.nombre}">${p.nombre}</option>`;
        });
    }
    const selProv = document.getElementById('proveedorCompra');
    if (selProv) {
        selProv.innerHTML = '<option value="">Seleccione un Proveedor</option>';
        proveedores.forEach(p=>{
            selProv.innerHTML += `<option value="${p.nombre}">${p.nombre}</option>`;
        });
    }
    const selProvG = document.getElementById('proveedorGasto');
    if (selProvG) {
        selProvG.innerHTML = '<option value="">Seleccione un Proveedor</option>';
        proveedores.forEach(p=>{
            selProvG.innerHTML += `<option value="${p.nombre}">${p.nombre}</option>`;
        });
    }
    const selClienteVenta = document.getElementById('clienteVenta');
    if (selClienteVenta) {
        selClienteVenta.innerHTML = '<option value="">Seleccione un Cliente</option>';
        clientes.forEach(c=>{
            selClienteVenta.innerHTML += `<option value="${c.nombre}">${c.nombre}</option>`;
        });
    }
}

// ---- LIBROS CONTABLES ----
function registrarLibroDiario({fecha, descripcion, asientos}){
    asientos.forEach(a=>{
        libroDiario.push({
            fecha, descripcion, cuenta: a.cuenta,
            debe: a.debe, haber: a.haber
        });
    });
    setLS('libroDiario', libroDiario);
}
function mostrarLibroDiario(){
    const tb = document.getElementById('tablaLibroDiario');
    if (!tb) return;
    tb.innerHTML = '';
    libroDiario.slice().reverse().forEach(l=>{
        let fecha = soloFecha(l.fecha);
        tb.innerHTML += `<tr>
            <td>${fecha}</td>
            <td>${l.descripcion}</td>
            <td>${l.cuenta}</td>
            <td>${l.debe ? (l.debe.toFixed(2) + '<br><span class="cotiz">USD ' + montoEnDolares(l.debe, fecha, l.cuenta.startsWith('IVA')||l.cuenta==="Proveedores"||l.cuenta==="Inventarios"||l.cuenta==="Gastos operativos"||l.cuenta==="Costos de ventas" ? 'compra':'venta') + '</span>') : ''}</td>
            <td>${l.haber ? (l.haber.toFixed(2) + '<br><span class="cotiz">USD ' + montoEnDolares(l.haber, fecha, l.cuenta.startsWith('IVA')||l.cuenta==="Proveedores"||l.cuenta==="Inventarios"||l.cuenta==="Gastos operativos"||l.cuenta==="Costos de ventas" ? 'compra':'venta') + '</span>') : ''}</td>
        </tr>`;
    });
}
function actualizarLibroMayor(cuenta, monto){
    if(!libroMayor[cuenta]) libroMayor[cuenta]=0;
    libroMayor[cuenta] += monto;
    setLS('libroMayor', libroMayor);
}
function mostrarLibroMayor(){
    const tb = document.getElementById('tablaLibroMayor');
    if (!tb) return;
    tb.innerHTML = '';
    cuentas.concat(categoriasGasto).filter((v,i,a)=>a.indexOf(v)===i).forEach(c=>{
        let saldo = libroMayor[c] || 0;
        let fecha = nowISO();
        if (libroDiario.length) {
            let ult = libroDiario.filter(l=>l.cuenta===c).slice(-1)[0];
            if (ult) fecha = ult.fecha;
        }
        tb.innerHTML += `<tr>
            <td>${c}</td>
            <td>$${saldo.toFixed(2)}<br><span class="cotiz">USD ${montoEnDolares(saldo, soloFecha(fecha), c.startsWith('IVA')||c==="Proveedores"||c==="Inventarios"||c==="Gastos operativos"||c==="Costos de ventas"? 'compra':'venta')}</span></td>
        </tr>`;
    });
}

// ---- INDICADORES DE GESTIÓN ----
function colorFlecha(valor) {
    if (valor > 0) return '<span class="indicador-flecha positivo">▲</span>';
    if (valor < 0) return '<span class="indicador-flecha negativo">▼</span>';
    return '<span class="indicador-flecha neutro">■</span>';
}
function mostrarIndicadoresGestion(){
    let totalVentas = 0, totalVentasUsd = 0;
    ventas.forEach(v=>{
        totalVentas += v.total;
        totalVentasUsd += montoEnDolares(v.total, soloFecha(v.fecha), 'venta');
    });
    let totalCompras = 0, totalComprasUsd = 0;
    compras.forEach(v=>{
        totalCompras += v.total;
        totalComprasUsd += montoEnDolares(v.total, soloFecha(v.fecha), 'compra');
    });
    let totalGastos = 0, totalGastosUsd = 0;
    gastos.forEach(g=>{
        totalGastos += g.total;
        totalGastosUsd += montoEnDolares(g.total, soloFecha(g.fecha), 'compra');
    });
    let egresos = totalCompras + totalGastos;
    let egresosUsd = totalComprasUsd + totalGastosUsd;
    let rentabilidad = totalVentas - egresos;
    let rentabilidadUsd = totalVentasUsd - egresosUsd;
    let margen = totalVentas > 0 ? (rentabilidad/totalVentas)*100 : 0;
    let stockValorizado = productos.reduce((a,p)=>a+(p.precioCompra||0)*(p.stock||0),0);
    let stockUsd = productos.reduce((a,p)=>{
        let monto = (p.precioCompra||0)*(p.stock||0);
        let fecha = (compras.find(c=>c.producto===p.nombre)?.fecha) || nowISO();
        return a + montoEnDolares(monto, soloFecha(fecha), 'compra');
    },0);
    let saldoClientes = 0, saldoClientesUsd = 0;
    clientes.forEach(c=>{
        ventas.forEach(v=>{
            if(v.cliente===c.nombre && v.tipoPago==="Cuenta Corriente") {
                saldoClientes += v.total;
                saldoClientesUsd += montoEnDolares(v.total, soloFecha(v.fecha), 'venta');
            }
        });
        pagosCC.forEach(p=>{
            if(p.tipo==="cliente" && p.nombre===c.nombre) {
                saldoClientes -= p.monto;
                saldoClientesUsd -= montoEnDolares(p.monto, soloFecha(p.fecha), 'venta');
            }
        });
    });
    let saldoProveedores = 0, saldoProveedoresUsd = 0;
    proveedores.forEach(p=>{
        compras.forEach(c=>{
            if(c.proveedor===p.nombre && c.tipoPago==="Cuenta Corriente") {
                saldoProveedores += c.total;
                saldoProveedoresUsd += montoEnDolares(c.total, soloFecha(c.fecha), 'compra');
            }
        });
        pagosCC.forEach(pg=>{
            if(pg.tipo==="proveedor" && pg.nombre===p.nombre) {
                saldoProveedores -= pg.monto;
                saldoProveedoresUsd -= montoEnDolares(pg.monto, soloFecha(pg.fecha), 'compra');
            }
        });
    });
    let ranking = {};
    ventas.forEach(v=>{
        ranking[v.producto] = (ranking[v.producto]||0) + v.cantidad;
    });
    let rankingArr = Object.entries(ranking).sort((a,b)=>b[1]-a[1]);

    document.getElementById('indicadoresGestion').innerHTML = `
        <div class="gestion-card"><h3>Ingresos</h3><b style="color:#2e7d32;">$${totalVentas.toFixed(2)}<br><span class="cotiz">USD ${totalVentasUsd.toFixed(2)}</span></b></div>
        <div class="gestion-card"><h3>Egresos</h3><b style="color:#c0392b;">$${egresos.toFixed(2)}<br><span class="cotiz">USD ${egresosUsd.toFixed(2)}</span></b></div>
        <div class="gestion-card"><h3>Rentabilidad</h3>
          <b class="${rentabilidad>0?'positivo':rentabilidad<0?'negativo':'neutro'}">
            $${rentabilidad.toFixed(2)} ${colorFlecha(rentabilidad)}
            <br><span class="cotiz">USD ${rentabilidadUsd.toFixed(2)}</span>
          </b>
        </div>
        <div class="gestion-card"><h3>Margen (%)</h3>
          <b class="${margen>0?'positivo':margen<0?'negativo':'neutro'}">
            ${margen.toFixed(2)}% ${colorFlecha(margen)}
          </b>
        </div>
        <div class="gestion-card"><h3>Stock Valorizado</h3><b>$${stockValorizado.toFixed(2)}<br><span class="cotiz">USD ${stockUsd.toFixed(2)}</span></b></div>
        <div class="gestion-card"><h3>Cta.Cte. Clientes</h3><b>$${saldoClientes.toFixed(2)}<br><span class="cotiz">USD ${saldoClientesUsd.toFixed(2)}</span></b></div>
        <div class="gestion-card"><h3>Cta.Cte. Proveedores</h3><b>$${saldoProveedores.toFixed(2)}<br><span class="cotiz">USD ${saldoProveedoresUsd.toFixed(2)}</span></b></div>
        <div class="gestion-card" style="flex:2;">
            <h3>Ranking Productos Vendidos</h3>
            <ol>
                ${rankingArr.length ? rankingArr.slice(0,5).map(r=>`<li>${r[0]} <b>x${r[1]}</b></li>`).join('') : "<li>Sin ventas</li>"}
            </ol>
        </div>
    `;
}

// ---- BACKUP ----
function exportarBackup() {
    const datos = {
        productos, compras, ventas, clientes, proveedores, gastos, libroDiario, libroMayor, pagosCC, auditoria, cotizaciones, categoriasGasto
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup_libreria_' + soloFecha(nowISO()) + '.json';
    a.click();
}
function importarBackup() {
    const input = document.getElementById('inputImportBackup');
    if (!input.files.length) {
        mostrarMsg('msgBackup', 'Debe seleccionar un archivo.', true); return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datos = JSON.parse(e.target.result);
            productos    = datos.productos || [];
            compras      = datos.compras   || [];
            ventas       = datos.ventas    || [];
            clientes     = datos.clientes  || [];
            proveedores  = datos.proveedores || [];
            gastos       = datos.gastos    || [];
            libroDiario  = datos.libroDiario || [];
            libroMayor   = datos.libroMayor || {};
            pagosCC      = datos.pagosCC   || [];
            auditoria    = datos.auditoria || [];
            cotizaciones = datos.cotizaciones || [];
            categoriasGasto = datos.categoriasGasto || categoriasGasto;
            setLS('productos', productos);
            setLS('compras', compras);
            setLS('ventas', ventas);
            setLS('clientes', clientes);
            setLS('proveedores', proveedores);
            setLS('gastos', gastos);
            setLS('libroDiario', libroDiario);
            setLS('libroMayor', libroMayor);
            setLS('pagosCC', pagosCC);
            setLS('auditoria', auditoria);
            setLS('cotizaciones', cotizaciones);
            setLS('categoriasGasto', categoriasGasto);
            recargarTablas();
            mostrarMsg('msgBackup', '¡Backup restaurado!');
        } catch (e) {
            mostrarMsg('msgBackup', 'Archivo inválido.', true);
        }
    };
    reader.readAsText(file);
}

// ---- REPORTES ----
function mostrarReporte(){
    const fi = document.getElementById('fechaInicioReporte').value;
    const ff = document.getElementById('fechaFinReporte').value;
    if(!fi || !ff) { mostrarMsg('reporteResultado', 'Seleccione rango de fechas.', true); return; }
    let desde = new Date(fi+"T00:00:00"), hasta = new Date(ff+"T23:59:59");
    let repVentas = ventas.filter(v=>new Date(v.fecha)>=desde && new Date(v.fecha)<=hasta);
    let repCompras = compras.filter(c=>new Date(c.fecha)>=desde && new Date(c.fecha)<=hasta);
    let repGastos = gastos.filter(g=>new Date(g.fecha)>=desde && new Date(g.fecha)<=hasta);

    let totalVentas = repVentas.reduce((a,v)=>a+v.total,0);
    let totalVentasUsd = repVentas.reduce((a,v)=>a+montoEnDolares(v.total, soloFecha(v.fecha), 'venta'),0);
    let totalCompras = repCompras.reduce((a,v)=>a+v.total,0);
    let totalComprasUsd = repCompras.reduce((a,v)=>a+montoEnDolares(v.total, soloFecha(v.fecha), 'compra'),0);
    let totalGastos = repGastos.reduce((a,v)=>a+v.total,0);
    let totalGastosUsd = repGastos.reduce((a,v)=>a+montoEnDolares(v.total, soloFecha(v.fecha), 'compra'),0);

    let html = `<div class="reporte-resumen">
        <b>Ventas:</b> $${totalVentas.toFixed(2)} (USD ${totalVentasUsd.toFixed(2)})<br>
        <b>Compras:</b> $${totalCompras.toFixed(2)} (USD ${totalComprasUsd.toFixed(2)})<br>
        <b>Gastos:</b> $${totalGastos.toFixed(2)} (USD ${totalGastosUsd.toFixed(2)})<br>
        <b>Rentabilidad:</b> $${(totalVentas-totalCompras-totalGastos).toFixed(2)} (USD ${(totalVentasUsd-totalComprasUsd-totalGastosUsd).toFixed(2)})
    </div>`;
    html += `<h3>Ventas</h3><table><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Total</th><th>Cliente</th></tr>`;
    repVentas.forEach(v=>{
        html += `<tr>
            <td>${soloFecha(v.fecha)}</td>
            <td>${v.producto}</td>
            <td>${v.cantidad}</td>
            <td>$${v.total.toFixed(2)}<br><span class="cotiz">USD ${montoEnDolares(v.total, soloFecha(v.fecha), 'venta')}</span></td>
            <td>${v.cliente}</td>
        </tr>`;
    });
    html += `</table>`;
    html += `<h3>Compras</h3><table><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Total</th><th>Proveedor</th></tr>`;
    repCompras.forEach(c=>{
        html += `<tr>
            <td>${soloFecha(c.fecha)}</td>
            <td>${c.producto}</td>
            <td>${c.cantidad}</td>
            <td>$${c.total.toFixed(2)}<br><span class="cotiz">USD ${montoEnDolares(c.total, soloFecha(c.fecha), 'compra')}</span></td>
            <td>${c.proveedor}</td>
        </tr>`;
    });
    html += `</table>`;
    html += `<h3>Gastos</h3><table><tr><th>Fecha</th><th>Categoría</th><th>Total</th><th>Proveedor</th></tr>`;
    repGastos.forEach(g=>{
        html += `<tr>
            <td>${soloFecha(g.fecha)}</td>
            <td>${g.categoria}</td>
            <td>$${g.total.toFixed(2)}<br><span class="cotiz">USD ${montoEnDolares(g.total, soloFecha(g.fecha), 'compra')}</span></td>
            <td>${g.proveedor}</td>
        </tr>`;
    });
    html += `</table>`;
    document.getElementById('reporteResultado').innerHTML = html;
}

// ---- INICIALIZACIÓN ----
recargarTablas();