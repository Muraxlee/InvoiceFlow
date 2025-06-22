
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PackagePlus, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ProductForm, type ProductFormValues } from "@/components/product-form";
import type { Product } from "@/types/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, addProduct, updateProduct, deleteProduct } from "@/lib/firestore-actions";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  
  const { data: products, isLoading: isDataLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getProducts,
    initialData: [],
  });

  const addMutation = useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      toast({ title: "Product Added", description: "The new product has been added." });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsAddProductDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, values: ProductFormValues }) => updateProduct(data.id, data.values),
    onSuccess: () => {
      toast({ title: "Product Updated", description: "Product details have been updated." });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditProductDialogOpen(false);
      setCurrentProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast({ title: "Product Deleted", description: "The product has been deleted." });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddProduct = async (data: ProductFormValues) => {
    addMutation.mutate(data);
  };

  const handleEditProductClick = (product: Product) => {
    setCurrentProduct(product);
    setIsEditProductDialogOpen(true);
  };

  const handleSaveEditedProduct = async (data: ProductFormValues) => {
    if (currentProduct) {
      updateMutation.mutate({ id: currentProduct.id, values: data });
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
                isLoading={addMutation.isPending}
                onCancel={() => setIsAddProductDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog open={isEditProductDialogOpen} onOpenChange={(isOpen) => {
        setIsEditProductDialogOpen(isOpen);
        if (!isOpen) setCurrentProduct(null);
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
              isLoading={updateMutation.isPending}
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
              {products?.map((product) => (
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
                          onConfirm={() => deleteMutation.mutate(product.id)}
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
           {!isDataLoading && (!products || products.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">No products found. Add a new product to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
