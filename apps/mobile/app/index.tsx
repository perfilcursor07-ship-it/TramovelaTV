import { useEffect, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';
import type { Novel } from '@novelas/shared';
import { api } from '../src/api';

/** Tela inicial de exemplo: lista as novelas em alta usando a mesma API do site. */
export default function Home() {
  const [novels, setNovels] = useState<Novel[]>([]);
  useEffect(() => {
    api.catalog.home().then((h) => setNovels(h.trending)).catch(console.warn);
  }, []);

  return (
    <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 }}>Em alta</Text>
      <FlatList
        data={novels}
        numColumns={3}
        keyExtractor={(n) => String(n.id)}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ gap: 14 }}
        renderItem={({ item }) => (
          <View style={{ flex: 1 / 3 }}>
            <Image source={{ uri: api.mediaUrl(item.cover_url) }} style={{ aspectRatio: 2 / 3, borderRadius: 12 }} />
            <Text numberOfLines={2} style={{ color: '#fff', fontSize: 12, marginTop: 6 }}>
              {item.title}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
