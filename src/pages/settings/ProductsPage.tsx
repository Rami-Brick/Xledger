import { useEffect, useState } from 'react'
import {
  getProducts,
  createProduct,
  updateProduct,
  toggleProductActive,
  deleteProduct,
  type Product,
  type ProductInsert,
} from '@/features/products/api'
import ProductFormDialog from '@/features/products/ProductFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const fetchProducts = async () => {
    try {
      const data = await getProducts()
      setProducts(data)
    } catch {
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleAdd = () => {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: ProductInsert) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data)
        toast.success('Produit modifié avec succès')
      } else {
        await createProduct(data)
        toast.success('Produit ajouté avec succès')
      }
      await fetchProducts()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleToggleActive = async (product: Product) => {
    try {
      await toggleProductActive(product.id, !product.is_active)
      toast.success(
        product.is_active
          ? `${product.name} a été désactivé`
          : `${product.name} a été réactivé`
      )
      await fetchProducts()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProduct(deleteTarget.id)
      toast.success(`${deleteTarget.name} a été supprimé`)
      setDeleteTarget(null)
      await fetchProducts()
    } catch {
      toast.error('Impossible de supprimer ce produit. Il est peut-être lié à des transactions.')
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Chargement...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Produits</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les produits pour le suivi des dépenses fournisseurs
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un produit
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun produit pour le moment.</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter un produit" pour commencer.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className={!product.is_active ? 'opacity-50' : ''}
              >
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {product.description || '—'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={product.is_active ? 'default' : 'secondary'}>
                    {product.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(product)}
                    >
                      {product.is_active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(product)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer ce produit ?"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}