"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"

interface Comment {
  id: string
  comentario: string
  creado_por: string
  fecha_creacion: string
}

export function TaskComments({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      }
    } catch (err) {
      console.error("Error al cargar comentarios:", err)
    }
  }

  useEffect(() => {
    fetchComments()
    const interval = setInterval(fetchComments, 10000)
    return () => clearInterval(interval)
  }, [taskId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: newComment }),
      })
      if (response.ok) {
        setNewComment("")
        fetchComments()
      }
    } catch (err) {
      console.error("Error al enviar comentario:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comentarios ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Añadir un comentario..."
            className="min-h-[80px]"
          />
          <Button type="submit" disabled={loading || !newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar>
                <AvatarFallback>{comment.creado_por.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.creado_por}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.fecha_creacion).toLocaleString("es-ES")}
                  </span>
                </div>
                <p className="text-sm">{comment.comentario}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
