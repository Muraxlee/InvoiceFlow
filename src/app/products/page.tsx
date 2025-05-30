"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PackagePlus, MoreHorizontal, Edit, Trash2, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
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

  const fetchProducts = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
          await fetchProducts(); // Re-fetch to get the latest list
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
        const errorMessage = error instanceof Error ? error.message : "Could not add product.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const handleEditProductClick = (product: Product) => {
    setCurrentProduct(product);
    setIsEditProductDialogOpen(true);
  };

  const handleSaveEditedProduct = async (data: ProductFormValues) => {
    setIsLoading(true);
     if (window.electronAPI && currentProduct) {
      try {
        const success = await window.electronAPI.updateProduct(currentProduct.id, data);
        if (success) {
          await fetchProducts(); // Re-fetch to get the updated list
          setIsLoading(false);
          setIsEditProductDialogOpen(false);
          setCurrentProduct(null);
          toast({
            title: "Product Updated",
            description: `Product ${data.name} has been successfully updated.`,
          });
        } else {
          throw new Error("Failed to update product via Electron API");
        }
      } catch (error) {
        console.error("Error updating product:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not update product.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
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
      <Dialog open={isEditProductDialogOpen} onOpenChange={(isOpen) => {
        setIsEditProductDialogOpen(isOpen);
        if (!isOpen) setCurrentProduct(null); // Reset current product when dialog closes
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below.
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
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead className="text-center">CGST %</TableHead>
                <TableHead className="text-center">SGST %</TableHead>
                <TableHead className="text-center">IGST %</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.hsn || '-'}</TableCell>
                  <TableCell className="text-center">{product.cgstRate}%</TableCell>
                  <TableCell className="text-center">{product.sgstRate}%</TableCell>
                  <TableCell className="text-center">{product.igstRate}%</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditProductClick(product)}>
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

      <p className="text-muted-foreground">Add product categories, tax settings, and track inventory for your business&apos;s product catalog.</p>
      <p className="text-sm text-muted-foreground">Don&apos;t see what you need? Create a custom product.</p>
    </div>
  );
}

    