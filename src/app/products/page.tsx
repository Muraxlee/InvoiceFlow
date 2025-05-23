
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PackagePlus, MoreHorizontal, Edit, Trash2, Info } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ProductForm, type ProductFormValues } from "@/components/product-form";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define Product type based on ProductFormValues and expected DB structure
export interface Product extends ProductFormValues {
  // id is already in ProductFormValues
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProducts() {
      setIsDataLoading(true);
      if (window.electronAPI) {
        try {
          const fetchedProducts = await window.electronAPI.getAllProducts();
          setProducts(fetchedProducts);
        } catch (error) {
          console.error("Error fetching products:", error);
          toast({ title: "Error", description: "Could not load products.", variant: "destructive" });
        }
      } else {
        toast({ title: "Error", description: "Desktop features not available in web mode.", variant: "destructive" });
      }
      setIsDataLoading(false);
    }
    fetchProducts();
  }, [toast]);

  const handleDeleteProduct = async (productId: string) => {
    if (window.electronAPI) {
      try {
        const success = await window.electronAPI.deleteProduct(productId);
        if (success) {
          setProducts(prev => prev.filter(p => p.id !== productId));
          toast({
            title: "Product Deleted",
            description: `Product ${productId} has been successfully deleted.`,
          });
        } else {
          throw new Error("Failed to delete product via Electron API");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
      }
    }
  };

  const handleAddProduct = async (data: ProductFormValues) => {
    setIsLoading(true);
    if (window.electronAPI) {
      try {
        // Check for duplicate ID client-side
        if (products.some(p => p.id === data.id)) {
          toast({
            title: "Error: Product ID Exists",
            description: `A product with ID ${data.id} already exists. Please use a unique ID.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        const success = await window.electronAPI.addProduct(data);
        if (success) {
          setProducts(prev => [...prev, data]); // Optimistically update UI or re-fetch
          setIsLoading(false);
          setIsAddProductDialogOpen(false);
          toast({
            title: "Product Added",
            description: `Product ${data.name} has been successfully added.`,
          });
        } else {
          throw new Error("Failed to add product via Electron API");
        }
      } catch (error) {
        console.error("Error adding product:", error);
        toast({ title: "Error", description: "Could not add product.", variant: "destructive" });
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
    setIsEditProductDialogOpen(true);
  };

  const handleSaveEditedProduct = async (data: ProductFormValues) => {
    setIsLoading(true);
    // Placeholder for Electron API call to update product
    // For now, just updates local state and shows a toast
    // await window.electronAPI.updateProduct(data);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    
    const updatedProducts = products.map(p => 
      p.id === data.id ? { ...data } : p
    );
    setProducts(updatedProducts);
    // await window.electronAPI.saveProducts(updatedProducts); // If saving all products at once
    
    setIsLoading(false);
    setIsEditProductDialogOpen(false);
    setCurrentProduct(null);
    
    toast({
      title: "Product Updated (Placeholder)",
      description: `Product ${data.name} has been updated in the UI. DB update via Electron API is a placeholder.`,
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
            <DialogContent className="sm:max-w-[600px]">
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

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below. (Edit functionality is a placeholder)
            </DialogDescription>
          </DialogHeader>
          {currentProduct && (
            <ProductForm 
              onSubmit={handleSaveEditedProduct}
              defaultValues={currentProduct}
              isLoading={isLoading}
              onCancel={() => {
                setIsEditProductDialogOpen(false);
                setCurrentProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>A list of all products.</CardDescription>
        </CardHeader>
        <CardContent>
        {isDataLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>GST Category</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    <span>GST Rates</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="w-80">
                          <div className="space-y-2 p-1">
                            <div>
                              <span className="font-medium">IGST (Inter-state GST):</span>
                              <span className="text-xs ml-1">Applied for sales between different states</span>
                            </div>
                            <div>
                              <span className="font-medium">CGST (Central GST):</span>
                              <span className="text-xs ml-1">Central government's portion for intra-state sales</span>
                            </div>
                            <div>
                              <span className="font-medium">SGST (State GST):</span>
                              <span className="text-xs ml-1">State government's portion for intra-state sales</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
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
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <Badge variant="default" className="flex items-center gap-1">
                          IGST: {product.igstRate}%
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-white cursor-help opacity-80" />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>Inter-state GST</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          CGST: {product.cgstRate}%
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help opacity-80" />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>Central GST</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="flex items-center gap-1">
                          SGST: {product.sgstRate}%
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help opacity-80" />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>State GST</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">₹{(product.price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditProduct(product)}>
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
          )}
           {!isDataLoading && products.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No products found. Add a new product to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
