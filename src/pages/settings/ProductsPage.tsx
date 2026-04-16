import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
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
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function ProductsPage() {
  const { canManage, loading: roleLoading } = useRole()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const fetchProducts = async () => {
    try {
      const data = await getProducts()
      setProducts(data)
    } catch { toast.error('Erreur lors du chargement des produits') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const handleAdd = () => { setEditingProduct(null); setDialogOpen(true) }
  const handleEdit = (p: Product) => { setEditingProduct(p); setDialogOpen(true) }

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
    } catch { toast.error("Erreur lors de l'enregistrement") }
  }

  const handleToggleActive = async (p: Product) => {
    try {
      await toggleProductActive(p.id, !p.is_active)
      toast.success(p.is_active ? `${p.name} désactivé` : `${p.name} réactivé`)
      await fetchProducts()
    } catch { toast.error('Erreur lors de la mise à jour') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProduct(deleteTarget.id)
      toast.success(`${deleteTarget.name} supprimé`)
      setDeleteTarget(null)
      await fetchProducts()
    } catch { toast.error('Impossible de supprimer ce produit.') }
  }

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Produits</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez les produits pour le suivi fournisseurs</p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter un produit</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun produit pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{product.name}</p>
                      <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(product)}>
                      <span className="text-xs">{product.is_active ? 'Off' : 'On'}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(product)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} onSubmit={handleSubmit} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer ce produit ?"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </div>
  )
}