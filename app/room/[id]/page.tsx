'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type RoomSession = {
  id: string;
  host_id: string;
  session_type: 'solo' | 'open';
  training_type: string | null;
  nutrition_type: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  scheduled_time: string | null;
  note: string | null;
};

type Participant = {
  id: string;
  session_id: string;
  user_id: string;
  status: 'joined' | 'requested';
  created_at: string;
};

type Message = {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

const formatWhen = (iso?: string | null) => {
  if (!iso) return 'Now';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Now';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function SessionRoomPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const load = useCallback(async () => {
    if (!id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    setUserId(user.id);

    const [{ data: sessionData }, { data: participantData }, { data: messageData }] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, host_id, session_type, training_type, nutrition_type, status, scheduled_time, note')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('session_participants')
        .select('id, session_id, user_id, status, created_at')
        .eq('session_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('session_room_messages')
        .select('id, session_id, sender_id, content, created_at')
        .eq('session_id', id)
        .order('created_at', { ascending: true }),
    ]);

    setSession((sessionData as RoomSession | null) || null);
    const participantsData = (participantData || []) as Participant[];
    setParticipants(participantsData);
    setMessages((messageData || []) as Message[]);

    const ids = Array.from(new Set([user.id, ...(participantsData.map((item) => item.user_id) || [])]));
    if (ids.length > 0) {
      const { data: profileData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids);
      setProfiles((profileData || []) as Profile[]);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`session-room-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_room_messages', filter: `session_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${id}` }, () => {
        void load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  const participantProfiles = useMemo(
    () => participants.map((p) => ({ participant: p, profile: profiles.find((x) => x.id === p.user_id) || null })),
    [participants, profiles]
  );

  const sendMessage = async () => {
    if (!id || !userId || !input.trim()) return;

    await supabase.from('session_room_messages').insert({
      session_id: id,
      sender_id: userId,
      content: input.trim(),
    });

    setInput('');
  };

  if (!session) {
    return <div className="min-h-screen bg-black text-white p-6">Loading room...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col bg-black text-white">
      <div className="p-4 border-b border-white/10">
        <div className="text-lg font-semibold">Session Room</div>
        <div className="text-xs text-gray-400 mt-1">
          {session.training_type || 'General'} · {session.nutrition_type || 'Balanced'} · {formatWhen(session.scheduled_time)}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">Type: {session.session_type} · Status: {session.status}</div>
        {session.note && <div className="text-xs text-gray-300 mt-2">{session.note}</div>}
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Participants</div>
        <div className="flex gap-3 flex-wrap">
          {participantProfiles.map(({ participant, profile }) => (
            <div key={participant.id} className="inline-flex items-center gap-2 text-xs text-gray-300">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`${profile.username || 'user'} avatar`}
                  width={24}
                  height={24}
                  unoptimized
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/10" />
              )}
              @{profile?.username || 'user'}
              <span className="text-[10px] text-gray-500">{participant.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${message.sender_id === userId ? 'bg-white text-black ml-auto' : 'bg-white/10 text-white'}`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
        />
        <button onClick={() => void sendMessage()} className="rounded-lg bg-white text-black px-4 text-sm font-semibold">
          Send
        </button>
      </div>
    </div>
  );
}
