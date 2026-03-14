'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Rss, PenSquare, Heart, MessageCircle, Share2, User, Shield } from 'lucide-react'

export default function FeedPage() {
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // For now, show sample posts
        setPosts([
            {
                id: '1',
                author: { name: 'Dr. Sarah Chen', specialization: 'Oncology', verified: true },
                content: 'Excited to share our latest research on early detection markers for breast cancer. The use of AI in radiology is truly transforming patient outcomes.',
                likes: 24,
                comments: 8,
                time: '2 hours ago'
            },
            {
                id: '2',
                author: { name: 'Dr. James Miller', specialization: 'Cardiology', verified: true },
                content: 'Case study: 45-year-old male presenting with atypical chest pain. Echo revealed EF of 35%. Started on guideline-directed therapy. Importance of early screening cannot be overstated.',
                likes: 18,
                comments: 5,
                time: '5 hours ago'
            }
        ])
        setIsLoading(false)
    }, [])

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="btn btn-ghost p-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="font-semibold text-slate-900">Medical Feed</h1>
                    </div>
                    <button className="btn btn-primary">
                        <PenSquare className="h-4 w-4" />
                        New Post
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
                {isLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : posts.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Rss className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="font-medium text-slate-900 mb-1">No posts yet</h3>
                        <p className="text-sm text-slate-500">Be the first to share something with your network</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="card p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                    {post.author.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-900">{post.author.name}</p>
                                        {post.author.verified && <Shield className="h-4 w-4 text-primary-500" />}
                                    </div>
                                    <p className="text-sm text-slate-500">{post.author.specialization} · {post.time}</p>
                                </div>
                            </div>
                            <p className="text-slate-700 mb-4">{post.content}</p>
                            <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                                <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors">
                                    <Heart className="h-5 w-5" />
                                    <span className="text-sm">{post.likes}</span>
                                </button>
                                <button className="flex items-center gap-2 text-slate-500 hover:text-primary-500 transition-colors">
                                    <MessageCircle className="h-5 w-5" />
                                    <span className="text-sm">{post.comments}</span>
                                </button>
                                <button className="flex items-center gap-2 text-slate-500 hover:text-primary-500 transition-colors">
                                    <Share2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
