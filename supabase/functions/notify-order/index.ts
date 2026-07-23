const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PedidoItem = {
  nombre?: string;
  cantidad?: number;
  precio?: number;
  subtotal?: number;
  detalle?: string[];
  quitados?: string[];
};

type PedidoPayload = {
  pedido_id?: number | string;
  cliente?: string;
  telefono?: string;
  detalle?: string;
  monto?: number;
  metodo_pago?: string;
  entrega?: string;
  direccion?: string;
  subtotal?: number;
  costo_envio?: number;
  items?: PedidoItem[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value: unknown) {
  const numberValue = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function normalizeWhatsappNumber(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function buildCustomerWhatsappUrl(pedido: PedidoPayload) {
  const telefono = normalizeWhatsappNumber(pedido.telefono);
  if (!telefono) return "";

  const texto = `Hola ${pedido.cliente || ""}, te escribimos por tu pedido #${pedido.pedido_id || ""} de PA' NOSOTROS.`;
  return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
}

function buildItemsHtml(items: PedidoItem[] = []) {
  if (!items.length) {
    return "<p>Sin detalle estructurado.</p>";
  }

  return `
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      <thead>
        <tr style="background:#f3f3f3">
          <th align="left">Producto</th>
          <th align="center">Cant.</th>
          <th align="right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => {
          const detalle = Array.isArray(item.detalle) && item.detalle.length
            ? `<br><small>${escapeHtml(item.detalle.join(" | "))}</small>`
            : "";
          const quitados = Array.isArray(item.quitados) && item.quitados.length
            ? `<br><small>SIN: ${escapeHtml(item.quitados.join(", ").toUpperCase())}</small>`
            : "";

          return `
            <tr>
              <td style="border-bottom:1px solid #eee">
                <strong>${escapeHtml(item.nombre)}</strong>${detalle}${quitados}
              </td>
              <td align="center" style="border-bottom:1px solid #eee">${escapeHtml(item.cantidad || 0)}</td>
              <td align="right" style="border-bottom:1px solid #eee">${formatMoney(item.subtotal)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function buildEmailHtml(pedido: PedidoPayload) {
  const whatsappUrl = buildCustomerWhatsappUrl(pedido);
  const whatsappButton = whatsappUrl
    ? `
      <p style="margin:16px 0 22px">
        <a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#25d366;color:#0b1b10;text-decoration:none;font-weight:700">
          Abrir WhatsApp del cliente
        </a>
      </p>
    `
    : "";

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.45">
      <h2 style="margin:0 0 12px">Nuevo pedido #${escapeHtml(pedido.pedido_id || "N/A")}</h2>
      <p style="margin:0 0 18px">Se creo un pedido desde el menu web.</p>
      ${whatsappButton}

      <h3>Cliente</h3>
      <p>
        <strong>Nombre:</strong> ${escapeHtml(pedido.cliente)}<br>
        <strong>WhatsApp:</strong> ${escapeHtml(pedido.telefono)}${whatsappUrl ? ` - <a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener">abrir chat</a>` : ""}<br>
        <strong>Entrega:</strong> ${escapeHtml(pedido.entrega)}<br>
        <strong>Direccion:</strong> ${escapeHtml(pedido.direccion)}<br>
        <strong>Pago:</strong> ${escapeHtml(pedido.metodo_pago)}
      </p>

      <h3>Pedido</h3>
      ${buildItemsHtml(pedido.items)}

      <h3>Total</h3>
      <p>
        <strong>Subtotal:</strong> ${formatMoney(pedido.subtotal)}<br>
        <strong>Envio:</strong> ${formatMoney(pedido.costo_envio)}<br>
        <strong>Total:</strong> ${formatMoney(pedido.monto)}
      </p>

      <h3>Detalle para respaldo</h3>
      <p>${escapeHtml(pedido.detalle)}</p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  const internalSecret = Deno.env.get("ORDER_INTERNAL_SECRET");
  const providedSecret = req.headers.get("x-internal-secret");
  if (!internalSecret || !providedSecret || providedSecret !== internalSecret) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailTo = Deno.env.get("ORDER_EMAIL_TO");
  const emailFrom = Deno.env.get("ORDER_EMAIL_FROM");

  if (!resendApiKey || !emailTo || !emailFrom) {
    return jsonResponse({ error: "Faltan secrets de email" }, 500);
  }

  let pedido: PedidoPayload;
  try {
    pedido = await req.json();
  } catch (_err) {
    return jsonResponse({ error: "Body invalido" }, 400);
  }

  if (!pedido.pedido_id || !pedido.cliente || !pedido.telefono || !pedido.monto) {
    return jsonResponse({ error: "Faltan datos del pedido" }, 400);
  }

  const subject = `Nuevo pedido #${pedido.pedido_id} - ${pedido.cliente}`;
  const html = buildEmailHtml(pedido);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [emailTo],
      subject,
      html,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Resend error:", result);
    return jsonResponse({ error: "No se pudo enviar el email", details: result }, 502);
  }

  return jsonResponse({ ok: true, id: result.id || null });
});
