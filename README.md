This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Fotos de jugadores

Guardá cada foto como un archivo PNG, JPG, JPEG o WebP en `public/jugadores/`. El nombre del
archivo es el ID del jugador en el Draft o, para jugadores que solo aparecen en
formaciones, su nombre en minúsculas y sin acentos, separado por guiones. Por
ejemplo, `public/jugadores/nahuel-losada.png` o
`public/jugadores/maximiliano-velazquez.jpg`. No hace falta editar ningún
JSON; si falta una foto, la interfaz muestra las iniciales. Usá únicamente
imágenes con permiso de uso.

## Ranking global del Draft

El ranking se guarda en Neon con el driver `@neondatabase/serverless`. Creá una base
en Neon y configurá su cadena de conexión como `DATABASE_URL`:

- En Vercel, agregá `DATABASE_URL` en Settings → Environment Variables para los
  entornos que uses y volvé a desplegar.
- Para desarrollo local, guardá `DATABASE_URL=...` en `.env.local` y reiniciá
  `npm run dev`. No compartas ni subas ese archivo al repositorio.

La tabla `draft_rankings` y el resultado histórico de Theo (83.5) se crean
automáticamente cuando `/api/draft-ranking` logra conectarse por primera vez.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
