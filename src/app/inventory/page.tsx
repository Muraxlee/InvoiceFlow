
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Boxes, MoreHorizontal, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { InventoryForm, type InventoryFormValues } from "@/components/inventory-form";
import type { InventoryItem, Product } from "@/types/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem, getProducts } from "@/lib/firestore-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { format, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();
  
  const { data: inventoryItems, isLoading, error, refetch } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: getInventoryItems,
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const productMap = useMemo(() => {
    if (!products) return new Map<string, Product>();
    return new Map(products.map(p => [p.id, p]));
  }, [products]);
  
  const categories = useMemo(() => {
    if (!products) return ["all"];
    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));
    return ["all", ...Array.from(uniqueCategories)];
  }, [products]);

  const filteredItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(item => {
      const product = productMap.get(item.productId);
      
      const lowercasedTerm = searchTerm.toLowerCase();
      const searchMatch = 
        item.productName.toLowerCase().includes(lowercasedTerm) ||
        product?.hsn?.toLowerCase().includes(lowercasedTerm);

      const categoryMatch = categoryFilter === 'all' || product?.category === categoryFilter;
      
      return searchMatch && categoryMatch;
    });
  }, [inventoryItems, searchTerm, productMap, categoryFilter]);

  const addMutation = useMutation({
    mutationFn: (data: InventoryFormValues) => addInventoryItem(data),
    onSuccess: () => {
      toast({ title: "Item Added", description: "The new inventory item has been added." });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsFormOpen(false);
      setCurrentItem(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, values: Partial<Omit<InventoryItem, 'id'>> }) => updateInventoryItem(data.id, data.values),
    onSuccess: () => {
      toast({ title: "Item Updated", description: "Inventory item details have been updated." });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsFormOpen(false);
      setCurrentItem(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      toast({ title: "Item Deleted", description: "The inventory item has been deleted." });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = async (data: InventoryFormValues) => {
    if (currentItem) {
      updateMutation.mutate({ id: currentItem.id, values: data });
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    setCurrentItem(item);
    setIsFormOpen(true);
  };

  const handleAddNewClick = () => {
    setCurrentItem(null);
    setIsFormOpen(true);
  }

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button onClick={() => refetch()} variant="outline" size="sm" className="hidden sm:flex">
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
      </Button>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleAddNewClick}>
            <Boxes className="mr-2 h-4 w-4" /> Add Inventory
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{currentItem ? 'Edit Stock' : 'Add New Inventory'}</DialogTitle>
            <DialogDescription>
              {currentItem ? 'Update the stock level for this product.' : 'Select a product to add to your inventory.'}
            </DialogDescription>
          </DialogHeader>
          <InventoryForm 
            products={products || []}
            inventoryItems={inventoryItems || []}
            onSubmit={handleFormSubmit}
            defaultValues={currentItem ?? undefined}
            isLoading={addMutation.isPending || updateMutation.isPending || isLoadingProducts}
            onCancel={() => { setIsFormOpen(false); setCurrentItem(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );

  if (error) {
     return (
      <div className="space-y-6">
        <PageHeader title="Inventory Management" description="Track stock levels for your items." actions={pageActions} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Inventory</AlertTitle>
          <AlertDescription>
            <p>Could not access inventory data. This may be due to Firestore permissions.</p>
            <p className="mt-2 font-semibold">Ensure your rules allow reading from the 'inventory' collection.</p>
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inventory Management" 
        description="Track stock levels for your products."
        actions={pageActions}
      />
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle>Stock List</CardTitle>
            <CardDescription>A list of all products in your inventory.</CardDescription>
          </div>
           <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or HSN..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.map((item) => {
                  const product = productMap.get(item.productId);
                  const updatedAtDate = item.updatedAt ? new Date(item.updatedAt.seconds * 1000) : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{product?.hsn || '-'}</TableCell>
                      <TableCell>{product?.category || '-'}</TableCell>
                      <TableCell className="text-center">{item.stock}</TableCell>
                      <TableCell>{updatedAtDate && isValid(updatedAtDate) ? format(updatedAtDate, 'dd MMM yyyy, HH:mm') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(item)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Stock
                            </DropdownMenuItem>
                            <ConfirmDialog
                              triggerButton={
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 w-full" onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              }
                              title={`Delete ${item.productName} from inventory`}
                              description="Are you sure you want to delete this inventory item? This will not delete the product itself."
                              onConfirm={() => deleteMutation.mutate(item.id)}
                              confirmText="Yes, Delete"
                              confirmVariant="destructive"
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
           {!isLoading && (!filteredItems || filteredItems.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">
              {searchTerm || categoryFilter !== 'all' ? `No items found for the current filters.` : "No inventory items found. Add an item to get started."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
