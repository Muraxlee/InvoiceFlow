import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PackagePlus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Image from "next/image";

// Placeholder data
const products = [
  { id: "PROD001", name: "Premium Widget", imageUrl:"https://placehold.co/40x40.png", description: "A high-quality widget for all your needs.", price: 29.99, gstCategory: "HSN 8471" },
  { id: "PROD002", name: "Standard Gadget", imageUrl:"https://placehold.co/40x40.png", description: "Reliable and affordable gadget.", price: 15.50, gstCategory: "HSN 8517" },
  { id: "PROD003", name: "Luxury Gizmo", imageUrl:"https://placehold.co/40x40.png", description: "Top-of-the-line gizmo with advanced features.", price: 99.00, gstCategory: "HSN 9006" },
];

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Products" 
        description="View, add, and manage your product catalog."
        actions={
          <Button> {/* In a real app, this would open a modal or navigate to a create page */}
            <PackagePlus className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>A list of all products.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>GST Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                   <TableCell>
                    <Image 
                      src={product.imageUrl} 
                      alt={product.name} 
                      width={40} 
                      height={40} 
                      className="rounded-sm"
                      data-ai-hint="product item" 
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-sm">{product.description}</TableCell>
                  <TableCell>{product.gstCategory}</TableCell>
                  <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
