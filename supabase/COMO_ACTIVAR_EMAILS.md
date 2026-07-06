# Activar emails de pedidos

Este sistema manda un email a `minispanosotros@gmail.com` cada vez que se crea un pedido desde el menu web.

## 1. Pegar la API key

Abrir:

```txt
supabase/.env
```

Reemplazar:

```env
RESEND_API_KEY=PEGAR_ACA_LA_API_KEY_DE_RESEND
```

Por la key real de Resend, por ejemplo:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
```

## 2. Subir secrets y desplegar

Desde la carpeta del menu cliente:

```bash
cd /Users/juanuceda/Desktop/PaNosotros-app-clientes
npx supabase login
npx supabase link --project-ref xpvqjuqywlkrutuukrxc
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy notify-order --no-verify-jwt
```

## 3. Flujo final

Cuando alguien toca **CONFIRMAR PEDIDO**:

1. Se guarda el pedido en Supabase.
2. Se manda un email a `minispanosotros@gmail.com`.
3. Se abre WhatsApp con el pedido armado.

Si el email falla, el pedido igual queda guardado y WhatsApp sigue funcionando.
