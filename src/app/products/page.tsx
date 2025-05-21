
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PackagePlus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

const LOCAL_STORAGE_KEY = "app_products";

const defaultProducts = [
  { id: "PROD001", name: "Premium Widget", imageUrl:"https://placehold.co/40x40.png", description: "A high-quality widget for all your needs.", price: 29.99, gstCategory: "HSN 8471" },
  { id: "PROD002", name: "Standard Gadget", imageUrl:"https://placehold.co/40x40.png", description: "Reliable and affordable gadget.", price: 15.50, gstCategory: "HSN 8517" },
  { id: "PROD003", name: "Luxury Gizmo", imageUrl:"https://placehold.co/40x40.png", description: "Top-of-the-line gizmo with advanced features.", price: 99.00, gstCategory: "HSN 9006" },
];

export type Product = typeof defaultProducts[0];


export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedProducts = loadFromLocalStorage<Product[]>(LOCAL_STORAGE_KEY, defaultProducts);
    setProducts(storedProducts);
  }, []);

  const handleDeleteProduct = (productId: string) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    saveToLocalStorage(LOCAL_STORAGE_KEY, updatedProducts);
    toast({
      title: "Product Deleted",
      description: `Product ${productId} has been successfully deleted.`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Products" 
        description="View, add, and manage your product catalog."
        actions={
          <Button onClick={() => alert("Add New Product: This is a placeholder. Implement form and update localStorage.")}>
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
                        <DropdownMenuItem onClick={() => alert(`Edit product ${product.id}. This is a placeholder. Implement edit form and functionality.`)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <ConfirmDialog
                          triggerButton={
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 w-full"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          }
                          title={`Delete Product ${product.name}`}
                          description="Are you sure you want to delete this product? This action cannot be undone."
                          onConfirm={() => handleDeleteProduct(product.id)}
                          confirmText="Yes, Delete"
                          confirmVariant="destructive"
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {products.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No products found. Add a new product to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
