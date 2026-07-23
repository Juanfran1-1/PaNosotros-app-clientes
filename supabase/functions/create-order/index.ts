import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CartItem = {
  id?: number | string;
  tipo_item?: "hamburguesa" | "promo";
  cantidad?: number;
  quitados?: unknown[];
  variedades?: Array<{ id?: number | string; cantidad?: number }>;
  extras?: Array<{ id?: number | string; cantidad?: number }>;
  aclaracion?: string;
};

type OrderRequest = {
  cliente?: string;
  telefono?: string;
  metodo_pago?: string;
  entrega?: string;
  direccion?: string;
  items?: CartItem[];
};

type ValidatedItem = {
  hamburguesa_id: number | null;
  promo_id: number | null;
  tipo_item: "hamburguesa" | "promo";
  nombre_snapshot: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  detalle: string[];
  quitados: string[];
  extras: Array<{
    extra_id: number;
    nombre_snapshot: string;
    precio_unitario: number;
    cantidad: number;
  }>;
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function positiveInteger(value: unknown, max = 20) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max ? parsed : null;
}

function uniqueIds(values: Array<number | string | undefined>) {
  return [...new Set(values.map(Number).filter(Number.isInteger))];
}

function getPromoRules(promo: Record<string, unknown>, relations: Array<Record<string, unknown>>) {
  const configuredAmounts = relations
    .map((relation) => Number(relation.cantidad || 0))
    .filter((amount) => amount > 0);
  const isLight = String(promo.nombre || "").toUpperCase().includes("LIGHT");
  return {
    total: configuredAmounts.length ? Math.max(...configuredAmounts) : (isLight ? 5 : 3),
    maxVarieties: promo.permite_variedades
      ? Math.max(2, Number(promo.max_variedades || 2))
      : 1,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const internalSecret = Deno.env.get("ORDER_INTERNAL_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !internalSecret) {
    return respond({ error: "La creación de pedidos no está configurada." }, 500);
  }

  let payload: OrderRequest;
  try {
    payload = await req.json();
  } catch (_error) {
    return respond({ error: "Solicitud inválida." }, 400);
  }

  const cliente = text(payload.cliente, 80);
  const telefono = text(payload.telefono, 24).replace(/\D/g, "");
  const metodoPago = payload.metodo_pago === "Transferencia" ? "Transferencia" : "Efectivo";
  const entrega = payload.entrega === "Retiro" ? "Retiro" : "Delivery";
  const direccion = entrega === "Delivery" ? text(payload.direccion, 180) : "Retira en local";
  const requestedItems = Array.isArray(payload.items) ? payload.items : [];

  if (cliente.length < 2 || telefono.length < 8 || telefono.length > 18) {
    return respond({ error: "Revisá el nombre y el número de WhatsApp." }, 400);
  }
  if (entrega === "Delivery" && direccion.length < 5) {
    return respond({ error: "Ingresá una dirección válida." }, 400);
  }
  if (!requestedItems.length || requestedItems.length > 30) {
    return respond({ error: "El pedido está vacío o supera el máximo permitido." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: config, error: configError } = await admin
    .from("configuracion")
    .select("abierto, mantenimiento, COSTO_ENVIO")
    .single();
  if (configError || !config) return respond({ error: "No se pudo comprobar el estado del local." }, 503);
  if (config.mantenimiento) return respond({ error: "Estamos mejorando nuestra receta. No recibimos pedidos por el momento." }, 409);
  if (!config.abierto) return respond({ error: "El local se encuentra cerrado actualmente." }, 409);

  const recentLimit = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentOrders } = await admin
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("numero", telefono)
    .gte("fecha", recentLimit);
  if ((recentOrders || 0) >= 3) {
    return respond({ error: "Esperá unos minutos antes de crear otro pedido." }, 429);
  }

  const productIds = uniqueIds(
    requestedItems
      .filter((item) => item.tipo_item !== "promo")
      .map((item) => item.id),
  );
  const promoIds = uniqueIds(
    requestedItems
      .filter((item) => item.tipo_item === "promo")
      .map((item) => item.id),
  );
  const varietyIds = uniqueIds(requestedItems.flatMap((item) =>
    (item.variedades || []).map((variety) => variety.id)
  ));
  const extraIds = uniqueIds(requestedItems.flatMap((item) =>
    (item.extras || []).map((extra) => extra.id)
  ));
  const allProductIds = [...new Set([...productIds, ...varietyIds])];

  const [
    productsResult,
    promosResult,
    promoItemsResult,
    extrasResult,
    promoExtrasResult,
  ] = await Promise.all([
    allProductIds.length
      ? admin.from("hamburguesas").select("id, nombre, precio, disponible").in("id", allProductIds)
      : Promise.resolve({ data: [], error: null }),
    promoIds.length
      ? admin.from("promos").select("id, nombre, precio, disponible, permite_variedades, max_variedades").in("id", promoIds)
      : Promise.resolve({ data: [], error: null }),
    promoIds.length
      ? admin.from("promo_items").select("promo_id, hamburguesa_id, cantidad").in("promo_id", promoIds)
      : Promise.resolve({ data: [], error: null }),
    extraIds.length
      ? admin.from("extras").select("id, nombre, precio, disponible").in("id", extraIds)
      : Promise.resolve({ data: [], error: null }),
    promoIds.length
      ? admin.from("promo_extras").select("promo_id, extra_id").in("promo_id", promoIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queryError = productsResult.error || promosResult.error || promoItemsResult.error
    || extrasResult.error || promoExtrasResult.error;
  if (queryError) {
    console.error("Error validating order catalog:", queryError);
    return respond({ error: "No se pudo validar el menú. Reintentá." }, 503);
  }

  const products = new Map((productsResult.data || []).map((item) => [Number(item.id), item]));
  const promos = new Map((promosResult.data || []).map((item) => [Number(item.id), item]));
  const extras = new Map((extrasResult.data || []).map((item) => [Number(item.id), item]));
  const promoRelations = promoItemsResult.data || [];
  const promoExtraRelations = promoExtrasResult.data || [];
  const validatedItems: ValidatedItem[] = [];

  try {
    for (const requested of requestedItems) {
      const id = positiveInteger(requested.id, Number.MAX_SAFE_INTEGER);
      const quantity = positiveInteger(requested.cantidad, 20);
      if (!id || !quantity) throw new Error("Hay un producto inválido en el pedido.");

      if (requested.tipo_item !== "promo") {
        const product = products.get(id);
        if (!product || product.disponible === false) {
          throw new Error("Uno de los productos ya no está disponible.");
        }
        const unitPrice = Number(product.precio);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Un producto no tiene un precio válido.");
        const removed = Array.isArray(requested.quitados)
          ? requested.quitados.map((item) => text(item, 60)).filter(Boolean).slice(0, 20)
          : [];
        validatedItems.push({
          hamburguesa_id: id,
          promo_id: null,
          tipo_item: "hamburguesa",
          nombre_snapshot: text(product.nombre, 140),
          precio_unitario: unitPrice,
          cantidad: quantity,
          subtotal: unitPrice * quantity,
          detalle: [],
          quitados: removed,
          extras: [],
        });
        continue;
      }

      const promo = promos.get(id);
      if (!promo || promo.disponible === false) throw new Error("Una de las promociones ya no está disponible.");
      const relations = promoRelations.filter((relation) => Number(relation.promo_id) === id);
      const allowedProductIds = new Set(relations.map((relation) => Number(relation.hamburguesa_id)));
      const rules = getPromoRules(promo, relations);
      const requestedVarieties = Array.isArray(requested.variedades) ? requested.variedades : [];
      const normalizedVarieties = requestedVarieties.map((variety) => ({
        id: positiveInteger(variety.id, Number.MAX_SAFE_INTEGER),
        cantidad: positiveInteger(variety.cantidad, rules.total),
      }));

      if (
        normalizedVarieties.some((variety) => !variety.id || !variety.cantidad)
        || normalizedVarieties.reduce((sum, variety) => sum + Number(variety.cantidad), 0) !== rules.total
        || new Set(normalizedVarieties.map((variety) => variety.id)).size > rules.maxVarieties
      ) {
        throw new Error(`La promo ${promo.nombre} no tiene una selección válida.`);
      }

      const detailLines: string[] = [];
      for (const variety of normalizedVarieties) {
        const product = products.get(Number(variety.id));
        if (!allowedProductIds.has(Number(variety.id)) || !product || product.disponible === false) {
          throw new Error("Una variedad de la promoción ya no está disponible.");
        }
        detailLines.push(`${variety.cantidad} ${product.nombre}`);
      }

      const validatedExtras: ValidatedItem["extras"] = [];
      let extrasUnitTotal = 0;
      for (const requestedExtra of (requested.extras || [])) {
        const extraId = positiveInteger(requestedExtra.id, Number.MAX_SAFE_INTEGER);
        const extraQuantity = positiveInteger(requestedExtra.cantidad, 10);
        const extra = extraId ? extras.get(extraId) : null;
        const allowed = extraId && promoExtraRelations.some((relation) =>
          Number(relation.promo_id) === id && Number(relation.extra_id) === extraId
        );
        if (!extraId || !extraQuantity || !extra || extra.disponible === false || !allowed) {
          throw new Error("Uno de los extras ya no está disponible para esa promoción.");
        }
        const extraPrice = Number(extra.precio);
        if (!Number.isFinite(extraPrice) || extraPrice < 0) throw new Error("Un extra no tiene un precio válido.");
        extrasUnitTotal += extraPrice * extraQuantity;
        detailLines.push(`+ ${extra.nombre}`);
        validatedExtras.push({
          extra_id: extraId,
          nombre_snapshot: text(extra.nombre, 140),
          precio_unitario: extraPrice,
          cantidad: extraQuantity * quantity,
        });
      }

      const clarification = text(requested.aclaracion, 180);
      if (clarification) detailLines.push(`Aclaración: ${clarification}`);
      const unitPrice = Number(promo.precio) + extrasUnitTotal;
      validatedItems.push({
        hamburguesa_id: null,
        promo_id: id,
        tipo_item: "promo",
        nombre_snapshot: `${text(promo.nombre, 100)} - ${detailLines.join(" | ")}`.slice(0, 500),
        precio_unitario: unitPrice,
        cantidad: quantity,
        subtotal: unitPrice * quantity,
        detalle: detailLines,
        quitados: [],
        extras: validatedExtras,
      });
    }
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Pedido inválido." }, 400);
  }

  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shipping = entrega === "Delivery" ? Number(config.COSTO_ENVIO || 0) : 0;
  const total = subtotal + shipping;
  const detail = validatedItems.map((item) => `${item.cantidad}x ${item.nombre_snapshot}`).join(" | ");
  const initialStatus = metodoPago === "Transferencia" ? "Pendiente de Pago" : "Esperando Confirmacion";

  const { data: order, error: orderError } = await admin
    .from("pedidos")
    .insert({
      fecha: new Date().toISOString(),
      detalle: detail,
      cliente,
      numero: telefono,
      monto: total,
      metodo_pago: metodoPago,
      entrega,
      direccion,
      estado: initialStatus,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    console.error("Error creating order:", orderError);
    return respond({ error: "No se pudo guardar el pedido." }, 500);
  }

  try {
    for (const item of validatedItems) {
      const { data: savedItem, error: itemError } = await admin
        .from("pedido_items")
        .insert({
          pedido_id: order.id,
          hamburguesa_id: item.hamburguesa_id,
          promo_id: item.promo_id,
          tipo_item: item.tipo_item,
          nombre_snapshot: item.nombre_snapshot,
          precio_unitario: item.precio_unitario,
          cantidad: item.cantidad,
          subtotal: item.subtotal,
        })
        .select("id")
        .single();
      if (itemError || !savedItem) throw itemError || new Error("No item ID");

      if (item.extras.length) {
        const { error: extrasError } = await admin.from("pedido_item_extras").insert(
          item.extras.map((extra) => ({ pedido_item_id: savedItem.id, ...extra })),
        );
        if (extrasError) throw extrasError;
      }
    }
  } catch (error) {
    console.error("Error creating order details:", error);
    await admin.from("pedidos").delete().eq("id", order.id);
    return respond({ error: "No se pudo guardar el detalle del pedido." }, 500);
  }

  const emailItems = validatedItems.map((item) => ({
    nombre: item.nombre_snapshot,
    cantidad: item.cantidad,
    precio: item.precio_unitario,
    subtotal: item.subtotal,
    detalle: item.detalle,
    quitados: item.quitados,
  }));
  let emailSent = false;
  try {
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/notify-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        pedido_id: order.id,
        cliente,
        telefono,
        detalle: detail,
        monto: total,
        metodo_pago: metodoPago,
        entrega,
        direccion,
        subtotal,
        costo_envio: shipping,
        items: emailItems,
      }),
    });
    emailSent = emailResponse.ok;
    if (!emailResponse.ok) console.error("Internal email failed:", await emailResponse.text());
  } catch (error) {
    console.error("Internal email request failed:", error);
  }

  return respond({
    ok: true,
    pedido_id: order.id,
    subtotal,
    costo_envio: shipping,
    total,
    email_enviado: emailSent,
  }, 201);
});
