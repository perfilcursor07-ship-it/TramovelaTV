# App Android (Expo) — estrutura inicial

Este app **ainda não está instalado** (fica fora dos workspaces do npm para não misturar
React Native com o React do site). Ele já reaproveita `packages/shared` (tipos + cliente da API),
então todas as rotas do backend funcionam igual ao web.

## Quando for desenvolver

```bash
cd apps/mobile
npm install
npx expo install --fix      # alinha as versões com o SDK do Expo
npx expo start              # abra no Expo Go (Android)
```

- Em `app.json > extra.apiUrl` coloque o IP da sua máquina na rede (ex.: `http://192.168.0.10:3333`).
- Player: use `expo-video` com a URL retornada por `api.catalog.stream(episodeId)` (prefixada com `apiUrl`).
- Token do login fica no `expo-secure-store`.

## Telas sugeridas (espelhando o web)

- `app/index.tsx` — Home (já com exemplo)
- `app/novela/[slug].tsx` — detalhes + episódios
- `app/assistir/[slug]/[ep].tsx` — feed vertical com paywall
- `app/(auth)/entrar.tsx` / `cadastro.tsx`
- `app/painel/*` — biblioteca, pedidos, perfil
