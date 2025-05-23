
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, UserPlus, UserCircle, Edit, Trash2, Shield, ShieldAlert, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { User as AppUserType } from "@/lib/database"; // Renamed to avoid conflict
import { 
  Form, 
  FormControl, 
  FormDescription,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// User type for UI, password is not directly handled here for display
type DisplayUser = Omit<AppUserType, 'password'>;

const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"), // Required for new users
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
  role: z.enum(["admin", "user"]),
  isActive: z.boolean().default(true),
});

const updateUserFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")), // Optional for updates
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
  role: z.enum(["admin", "user"]),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;
type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DisplayUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const addUserForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { username: "", password: "", name: "", email: "", role: "user", isActive: true },
  });

  const editUserForm = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: { username: "", password: "", name: "", email: "", role: "user", isActive: true },
  });

  const fetchUsers = async () => {
    setIsDataLoading(true);
    if (window.electronAPI) {
      try {
        const fetchedUsers = await window.electronAPI.getAllUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
      }
    } else {
      toast({ title: "Error", description: "Desktop features not available in web mode.", variant: "destructive" });
    }
    setIsDataLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [toast]);

  const handleAddUser = async (data: UserFormValues) => {
    setIsLoading(true);
    if (window.electronAPI) {
      try {
        const newUserId = await window.electronAPI.createUser(data); // Password sent as plain text
        if (newUserId) {
          toast({ title: "User Added", description: `User ${data.name || data.username} has been successfully added.` });
          setIsAddUserDialogOpen(false);
          addUserForm.reset();
          fetchUsers(); // Re-fetch to get the latest list
        } else {
          throw new Error("Failed to add user via Electron API");
        }
      } catch (error) {
        console.error("Error adding user:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not add user.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    }
    setIsLoading(false);
  };

  const handleEditClick = (user: DisplayUser) => {
    setSelectedUser(user);
    editUserForm.reset({
      username: user.username,
      password: "", // Clear password field, user should re-enter if changing
      name: user.name || "",
      email: user.email || "",
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditUserDialogOpen(true);
  };
  
  const handleSaveEditedUser = async (data: UpdateUserFormValues) => {
    if (!selectedUser) return;
    setIsLoading(true);
    if (window.electronAPI) {
      try {
        const updatePayload: Partial<AppUserType> & { password?: string } = { ...data };
        if (!data.password) { // If password is empty, don't send it for update
          delete updatePayload.password;
        }
        const success = await window.electronAPI.updateUser(selectedUser.id, updatePayload);
        if (success) {
          toast({ title: "User Updated", description: `User ${data.username} has been successfully updated.` });
          setIsEditUserDialogOpen(false);
          setSelectedUser(null);
          fetchUsers(); // Re-fetch
        } else {
          throw new Error("Failed to update user via Electron API");
        }
      } catch (error) {
        console.error("Error updating user:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not update user.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    }
    setIsLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.isSystemAdmin) {
      toast({ title: "Error", description: "System admin user cannot be deleted.", variant: "destructive" });
      return;
    }
    if (window.electronAPI) {
      try {
        const success = await window.electronAPI.deleteUser(userId);
        if (success) {
          toast({ title: "User Deleted", description: `User has been successfully deleted.` });
          fetchUsers(); // Re-fetch
        } else {
          throw new Error("Failed to delete user via Electron API");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not delete user.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="User Management" 
        description="Manage user accounts and their permissions."
        actions={
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => addUserForm.reset()}>
                <UserPlus className="mr-2 h-4 w-4" /> Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Fill in the details below to create a new user account.</DialogDescription>
              </DialogHeader>
              <Form {...addUserForm}>
                <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4">
                  <FormField control={addUserForm.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="e.g., john.doe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addUserForm.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={addUserForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name (Optional)</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={addUserForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={addUserForm.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>Role</FormLabel>
                      <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="user">User</option><option value="admin">Admin</option>
                      </select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addUserForm.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Active</FormLabel><FormDescription>User can log in.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add User</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Edit User Dialog */}
      {selectedUser && (
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit User: {selectedUser.username}</DialogTitle>
              <DialogDescription>Update user details. Password is optional.</DialogDescription>
            </DialogHeader>
            <Form {...editUserForm}>
              <form onSubmit={editUserForm.handleSubmit(handleSaveEditedUser)} className="space-y-4">
                <FormField control={editUserForm.control} name="username" render={({ field }) => (
                  <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editUserForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>New Password (Optional)</FormLabel><FormControl><Input type="password" placeholder="Leave blank to keep current" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={editUserForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name (Optional)</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editUserForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                <FormField control={editUserForm.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>Role</FormLabel>
                    <select {...field} disabled={selectedUser.isSystemAdmin} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="user">User</option><option value="admin">Admin</option>
                    </select>
                    {selectedUser.isSystemAdmin && <FormDescription className="text-xs text-destructive">System admin role cannot be changed.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editUserForm.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5"><FormLabel>Active</FormLabel><FormDescription>User can log in.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={selectedUser.isSystemAdmin && !field.value} /></FormControl>
                     {selectedUser.isSystemAdmin && !field.value && <FormDescription className="text-xs text-destructive w-full mt-1">System admin cannot be deactivated.</FormDescription>}
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditUserDialogOpen(false)} disabled={isLoading}>Cancel</Button>
                  <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>A list of all user accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium flex items-center gap-1">
                      {user.isSystemAdmin ? <ShieldAlert className="h-4 w-4 text-yellow-500" /> : <UserCircle className="h-4 w-4 text-muted-foreground" />}
                      {user.username}
                    </TableCell>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize flex items-center gap-1 w-fit">
                        {user.role === "admin" && <Shield className="h-3 w-3"/>}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "success" : "destructive"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(user)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          {!user.isSystemAdmin && (
                            <ConfirmDialog
                              triggerButton={<DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 w-full" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>}
                              title={`Delete User ${user.username}`}
                              description="Are you sure you want to delete this user? This action cannot be undone."
                              onConfirm={() => handleDeleteUser(user.id)}
                              confirmText="Yes, Delete" confirmVariant="destructive"
                            />
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isDataLoading && users.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No users found. Add a new user to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
