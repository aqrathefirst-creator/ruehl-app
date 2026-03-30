'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type AuthUser = {
  id: string
}

type RoomMessage = {
  id: string
  sender_id: string
  content: string
}

type TrainingMatch = {
  id: string
  user_a: string
  user_b: string
}

type Profile = {
  id: string
  username?: string | null
  avatar_url?: string | null
  activity_type?: string | null
}

type Booking = {
  id: string
  status: 'pending' | 'confirmed' | 'declined'
  proposed_by: string
  completed?: boolean
}

export default function RoomPage() {
  const params = useParams()
  const matchId = params?.matchId as string | undefined

  const [user, setUser] = useState<AuthUser | null>(null)
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [input, setInput] = useState('')
  const [match, setMatch] = useState<TrainingMatch | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [bookingTime, setBookingTime] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)

  // REALTIME MESSAGES
  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel('room-' + matchId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as RoomMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  async function init() {
    const { data } = await supabase.auth.getUser()
    setUser((data.user as AuthUser | null) || null)

    if (!data.user) return

    const { data: matchData } = await supabase
      .from('training_matches')
      .select('*')
      .eq('id', matchId)
      .single()

    setMatch(matchData)

    const { data: msgs } = await supabase
      .from('session_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')

    setProfiles(prof || [])

    const { data: b } = await supabase
      .from('booked_sessions')
      .select('*')
      .eq('match_id', matchId)
      .single()

    setBooking(b)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void init()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || !user || !matchId) return

    await supabase.from('session_messages').insert({
      match_id: matchId,
      sender_id: user.id,
      content: input,
    })

    // Update streak only for authenticated users sending a message.
    await supabase.rpc('update_streak', {
      user_id_input: user.id,
    })

    setInput('')
  }

  const proposeSession = async () => {
    if (!bookingTime || !user || !matchId) return

    await supabase.from('booked_sessions').insert({
      match_id: matchId,
      proposed_by: user.id,
      date_time: bookingTime,
    })

    init()
  }

  const respondBooking = async (accept: boolean) => {
    if (!booking || !matchId) return

    await supabase
      .from('booked_sessions')
      .update({ status: accept ? 'confirmed' : 'declined' })
      .eq('id', booking.id)

    init()
  }

  const completeSession = async () => {
    if (!booking || !user || !matchId) return

    await supabase.rpc('update_streak', {
      user_id_input: user.id,
    })

    await supabase
      .from('booked_sessions')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    // RANK UPDATE
    await supabase.rpc('increase_rank', {
      user_id_input: user.id,
    })

    init()
  }

  const getOtherUser = (): string | null => {
    if (!match || !user) return null
    return match.user_a === user.id ? match.user_b : match.user_a
  }

  const getProfile = (id: string) => {
    return profiles.find(p => p.id === id)
  }

  const otherUserId = getOtherUser()
  const otherProfile = otherUserId ? getProfile(otherUserId) : null

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col">

      {/* HEADER */}
      <div className="p-4 border-b flex items-center gap-3">
        {otherProfile?.avatar_url && (
          <img
            src={otherProfile.avatar_url}
            className="w-10 h-10 rounded-lg object-cover"
          />
        )}
        <div>
          <div className="font-semibold">
            {otherProfile?.username}
          </div>
          <div className="text-xs text-gray-500">
            {otherProfile?.activity_type}
          </div>
        </div>
      </div>

      {/* BOOKING SECTION */}
      <div className="p-4 border-b space-y-3">

        {/* PROPOSE */}
        {!booking && (
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="border p-2 rounded flex-1"
            />
            <button
              onClick={proposeSession}
              className="bg-black text-white px-4 rounded"
            >
              Propose
            </button>
          </div>
        )}

        {/* ACCEPT / DECLINE */}
        {booking && booking.status === 'pending' && booking.proposed_by !== user?.id && (
          <div className="flex gap-2">
            <button
              onClick={() => respondBooking(true)}
              className="bg-green-500 text-black px-4 py-2 rounded"
            >
              Accept
            </button>
            <button
              onClick={() => respondBooking(false)}
              className="bg-gray-700 text-white px-4 py-2 rounded"
            >
              Decline
            </button>
          </div>
        )}

        {/* CONFIRMED */}
        {booking && booking.status === 'confirmed' && !booking.completed && (
          <div className="space-y-2">

            <div className="text-green-500 text-sm">
              ● Session confirmed
            </div>

            <button
              onClick={completeSession}
              className="bg-purple-500 text-white px-4 py-2 rounded"
            >
              Complete session
            </button>

          </div>
        )}

        {/* COMPLETED */}
        {booking && booking.completed && (
          <div className="text-green-500 text-sm">
            ● Session completed
          </div>
        )}

      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => (
          <div
            key={m.id}
            className={`max-w-[70%] p-3 rounded-lg ${
              m.sender_id === user?.id
                ? 'bg-black text-white ml-auto'
                : 'bg-gray-200 text-black'
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="p-4 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 rounded"
        >
          Send
        </button>
      </div>

    </div>
  )
}