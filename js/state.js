// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://xpvqjuqywlkrutuukrxc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdnFqdXF5d2xrcnV0dXVrcnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDQwNTMsImV4cCI6MjA4ODUyMDA1M30.6HikuOJDbY8Z-hCT-oJPau6XZJ4Bs0UErQvNRy9zDC4";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. VARIABLES GLOBALES
let carrito = [];
let total = 0;
let productoSeleccionado = null;
let cantidadEnDetalle = 1;
let pantallaDestinoTemporal = null;
let productos = [];
let promos = [];
let extras = [];
let filtroMenu = 'todas';
let COSTO_ENVIO = 0;
let cantidadesPromo = {};
let extraPromoSeleccionado = null;
let aclaracionPromoDetalle = '';
let whatsappPedidoUrl = '';
let realtimeMenuChannel = null;
let menuRefreshTimer = null;
let menuPollingTimer = null;
let ultimoSnapshotMenu = '';

let configTienda = {
    whatsapp: "",
    alias_mp: "",
    abierto: true,
    promo_titulo: "",
    direccion_local: "",
};
