"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Users, UserPlus, Mail, Clock, FolderOpen, Code, Shield, Trash2 } from "lucide-react"
import { useUserStore, type RegisteredUser } from "@/lib/user-store"
import { useAuth } from "@/lib/auth-context"

function formatDate(iso: string): string {
  if (!iso) return "N/A"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function timeSince(iso: string): string {
  if (!iso) return ""
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function UsersPanel() {
  const { users, totalUsers, totalProjects, totalLines, deleteUser } = useUserStore()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<RegisteredUser | null>(null)

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return

    deleteUser(deleteTarget.email)
    toast({
      title: "User deleted",
      description: `User "${deleteTarget.name}" and their associated data have been removed.`,
    })
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-violet-400" />
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
          <p className="text-2xl font-mono font-bold">{totalUsers}</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-muted-foreground">Total Projects</p>
          </div>
          <p className="text-2xl font-mono font-bold">{totalProjects}</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Code className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-muted-foreground">Lines Generated</p>
          </div>
          <p className="text-2xl font-mono font-bold">{totalLines.toLocaleString()}</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-muted-foreground">Admins</p>
          </div>
          <p className="text-2xl font-mono font-bold">{users.filter(u => u.role === "admin").length}</p>
        </Card>
      </div>

      {/* User List */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Registered Users
            </CardTitle>
            <Badge variant="outline" className="font-mono">{totalUsers} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No users have signed up yet.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                When users create accounts on Funaloo, they will appear here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">User</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-1">Role</div>
                  <div className="col-span-2">Signed Up</div>
                  <div className="col-span-1 text-center">Projects</div>
                  <div className="col-span-1 text-center">Lines</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>
                <Separator />
                {users.map((user) => (
                  <div key={user.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors">
                    <div className="col-span-3">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground">{timeSince(user.lastLoginAt)}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-mono text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="col-span-1">
                      <Badge variant="outline" className={`text-[9px] ${user.role === "admin" ? "border-violet-500/30 text-violet-400" : ""}`}>
                        {user.role === "admin" && <Shield className="h-2.5 w-2.5 mr-0.5" />}
                        {user.role}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{formatDate(user.signedUpAt)}</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-sm font-mono">{user.projectCount}</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-sm font-mono">{(user.totalLinesGenerated || 0).toLocaleString()}</p>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        disabled={currentUser?.email === user.email}
                        onClick={() => setDeleteTarget(user)}
                        title={currentUser?.email === user.email ? "Cannot delete yourself" : "Delete user"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) and all their projects.
              Evolution progress data will not be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}