/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable jsx-a11y/alt-text */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ListRenderItem,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { supabase } from './supabase';

type Post = {
  id: string;
  content: string | null;
  media_url: string | null;
  user_id: string;
};

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const isVideoUrl = (url: string): boolean => {
  const cleanUrl = url.split('?')[0].toLowerCase();
  return /\.(mp4|mov|m4v|webm|avi|mkv)$/.test(cleanUrl);
};

export default function HomeFeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('posts')
      .select('id, content, media_url, user_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch posts:', error.message);
      setPosts([]);
      setLoading(false);
      return;
    }

    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const renderItem: ListRenderItem<Post> = useCallback(({ item }: { item: Post }) => {
    const mediaUrl = item.media_url?.trim() || null;

    return (
      <View style={styles.postContainer}>
        {mediaUrl ? (
          isVideoUrl(mediaUrl) ? (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
          ) : (
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
          )
        ) : (
          <View style={styles.textOnlyContainer}>
            <Text style={styles.textOnlyContent}>{item.content?.trim() || ' '}</Text>
          </View>
        )}
      </View>
    );
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ffffff" size="small" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList<Post>
        data={posts}
        keyExtractor={(item: Post) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        windowSize={3}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        removeClippedSubviews
        getItemLayout={(
          _data: ArrayLike<Post> | null | undefined,
          index: number
        ) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  textOnlyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#000000',
  },
  textOnlyContent: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
  },
});
