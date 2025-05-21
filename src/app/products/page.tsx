
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ProductForm, type ProductFormValues } from "@/components/product-form";

const LOCAL_STORAGE_KEY = "app_products";

const defaultProducts = [
  { id: "PROD001", name: "Premium Widget", imageUrl:"https://placehold.co/60x60.png", description: "A high-quality widget for all your needs.", price: 29.99, gstCategory: "HSN 8471" },
  { id: "PROD002", name: "Standard Gadget", imageUrl:"https://placehold.co/60x60.png", description: "Reliable and affordable gadget.", price: 15.50, gstCategory: "HSN 8517" },
  { id: "PROD003", name: "Luxury Gizmo", imageUrl:"https://placehold.co/60x60.png", description: "Top-of-the-line gizmo with advanced features.", price: 99.00, gstCategory: "HSN 9006" },
];

export type Product = typeof defaultProducts[0];


export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleAddProduct = async (data: ProductFormValues) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    if (products.some(p => p.id === data.id)) {
      toast({
        title: "Error: Product ID Exists",
        description: `A product with ID ${data.id} already exists. Please use a unique ID.`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    const newProduct: Product = { ...data };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    saveToLocalStorage(LOCAL_STORAGE_KEY, updatedProducts);
    
    setIsLoading(false);
    setIsAddProductDialogOpen(false);
    toast({
      title: "Product Added",
      description: `Product ${data.name} has been successfully added.`,
    });
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Products" 
        description="View, add, and manage your product catalog."
        actions={
          <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PackagePlus className="mr-2 h-4 w-4" /> Add New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Fill in the details below to add a new product to your catalog.
                </DialogDescription>
              </DialogHeader>
              <ProductForm 
                onSubmit={handleAddProduct} 
                isLoading={isLoading}
                onCancel={() => setIsAddProductDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
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
                      src={product.imageUrl || "https://placehold.co/60x60.png"} 
                      alt={product.name} 
                      width={60} 
                      height={60} 
                      className="rounded-md object-cover aspect-square"
                      data-ai-hint="product item"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/60x60.png?text=Error")} 
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

