'use client'
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type PowrPost = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
  }
  likes: number
  replies: number
}

type AuthUser = {
  id: string
}

type PowrInteraction = {
  powr_id: string
}

type PowrPostRow = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
  }[] | null
}

type ScoredPowrPost = PowrPost & { score: number }

export default function PowrFeedPage() {
  const [posts, setPosts] = useState<PowrPost[]>([])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const PAGE_SIZE = 10

  async function fetchUser() {
    const { data } = await supabase.auth.getUser()
    setUser((data.user as AuthUser | null) || null)
  }

  async function fetchPosts(pageNumber: number, reset = false) {
    if (!user) return
    setLoading(true)

    const from = pageNumber * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    // USER INTERACTIONS (PERSONALIZATION)
    const { data: userLikes } = await supabase
      .from('powr_likes')
      .select('powr_id')
      .eq('user_id', user.id)

    const { data: userReplies } = await supabase
      .from('powr_replies')
      .select('powr_id')
      .eq('user_id', user.id)

    const likedRows = (userLikes || []) as PowrInteraction[]
    const replyRows = (userReplies || []) as PowrInteraction[]

    const interactedPostIds = [
      ...likedRows.map((l) => l.powr_id),
      ...replyRows.map((r) => r.powr_id),
    ]

    const { data, error } = await supabase
      .from('powr_posts')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const postRows = (data || []) as PowrPostRow[]

    const postsWithCounts: PowrPost[] = await Promise.all(
      postRows.map(async (post) => {
        const { count: likes } = await supabase
          .from('powr_likes')
          .select('*', { count: 'exact', head: true })
          .eq('powr_id', post.id)

        const { count: replies } = await supabase
          .from('powr_replies')
          .select('*', { count: 'exact', head: true })
          .eq('powr_id', post.id)

        const profile = Array.isArray(post.profiles) && post.profiles.length > 0
          ? post.profiles[0]
          : { username: 'user', avatar_url: null }

        return {
          ...post,
          profiles: profile,
          likes: likes || 0,
          replies: replies || 0,
        }
      })
    )

    // VIRAL + PERSONALIZED SCORING
    const scoredPosts: ScoredPowrPost[] = postsWithCounts.map((post) => {
      const ageHours =
        (Date.now() - new Date(post.created_at).getTime()) / 1000 / 60 / 60

      const engagement =
        post.likes * 2 +
        post.replies * 3

      const velocity = engagement / (ageHours + 1)

      const affinityBoost = interactedPostIds.includes(post.id) ? 5 : 0

      const score =
        engagement +
        velocity * 5 +
        affinityBoost -
        ageHours * 0.5

      return {
        ...post,
        score,
      }
    })

    scoredPosts.sort((a, b) => b.score - a.score)

    setPosts((prev) =>
      reset ? scoredPosts : [...prev, ...scoredPosts]
    )

    setLoading(false)
  }

  function loadMorePosts() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage)
  }

  useEffect(() => {
    fetchUser()
    fetchPosts(0, true)

    const channel = supabase
      .channel('powr-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'powr_posts',
        },
        (payload) => {
          setPosts((prev) => [
            {
              ...payload.new,
              profiles: { username: 'user', avatar_url: null },
              likes: 0,
              replies: 0,
            } as PowrPost,
            ...prev,
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 300

      if (nearBottom && !loading) {
        loadMorePosts()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loading, page])

  const toggleLike = async (postId: string) => {
    if (!user) return

    const { data: existing } = await supabase
      .from('powr_likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('powr_id', postId)
      .single()

    if (existing) {
      await supabase
        .from('powr_likes')
        .delete()
        .eq('id', existing.id)
    } else {
      await supabase.from('powr_likes').insert({
        user_id: user.id,
        powr_id: postId,
      })
    }

    fetchPosts(0, true)
  }

  const deletePost = async (postId: string, ownerId: string) => {
    if (user?.id !== ownerId) return

    await supabase.from('powr_posts').delete().eq('id', postId)
    fetchPosts(0, true)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {posts.map((post) => (
        <div key={post.id} className="py-5 border-b border-gray-200">
          
          <div className="flex items-center gap-3 mb-2">
            {post.profiles?.avatar_url && (
              <img
                src={post.profiles.avatar_url}
                className="w-9 h-9 rounded-full"
              />
            )}
            <span className="font-semibold text-sm tracking-tight">
              {post.profiles?.username || 'user'}
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-black mb-3">
            {post.content}
          </p>

          <div className="flex gap-5 text-sm text-gray-500">
            <button
              onClick={() => toggleLike(post.id)}
              className="hover:text-black transition"
            >
              ♥ {post.likes}
            </button>

            <span>Replies {post.replies}</span>

            {user?.id === post.user_id && (
              <button
                onClick={() => deletePost(post.id, post.user_id)}
                className="text-red-500"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="text-center py-6 text-gray-400 text-sm">
          Loading...
        </div>
      )}
    </div>
  )
}