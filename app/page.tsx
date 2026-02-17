"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Bookmark = {
  id: string
  title: string
  url: string
}

export default function Home() {

  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
  getUser()
  fetchBookmarks()

  const { data: authListener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null)
    }
  )

  const channel = supabase
    .channel("bookmarks")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookmarks" },
      fetchBookmarks
    )
    .subscribe()

  return () => {
    authListener.subscription.unsubscribe()
    supabase.removeChannel(channel)
  }
}, [])


  const getUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google"
    })
  }

  const fetchBookmarks = async () => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false })

    setBookmarks(data || [])
  }

  const addBookmark = async () => {
    if (!user) {
      alert("User not logged in")
      return
    }

    await supabase.from("bookmarks").insert({
      title,
      url,
      user_id: user.id
    })

    setTitle("")
    setUrl("")
    fetchBookmarks()
  }

  const deleteBookmark = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id)
    fetchBookmarks()
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <button
          onClick={loginWithGoogle}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Login with Google
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <button
        onClick={async () => {
        await supabase.auth.signOut()
        setUser(null)
        }}
        className="mb-4 bg-red-500 text-white px-4 py-2 rounded">Logout</button>


      <h1 className="text-2xl font-bold mb-4">My Bookmarks</h1>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Title"
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          className="border p-2 flex-1"
        />

        <input
          placeholder="URL"
          value={url}
          onChange={(e)=>setUrl(e.target.value)}
          className="border p-2 flex-1"
        />

        <button
          onClick={addBookmark}
          className="bg-blue-500 text-white px-4"
        >
          Add
        </button>
      </div>

      {bookmarks.map((b)=>(
        <div key={b.id} className="flex justify-between border p-2 mb-2">
          <a href={b.url} target="_blank" className="text-blue-600">
            {b.title}
          </a>
          <button onClick={()=>deleteBookmark(b.id)}>❌</button>
        </div>
      ))}

    </div>
  )
}
