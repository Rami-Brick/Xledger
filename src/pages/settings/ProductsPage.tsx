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

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px] min-w-0">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Produits
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Gérez les produits pour le suivi fournisseurs
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter un produit</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      <div className="premium-surface premium-surface-airy surface-tint-warning rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Catalogue
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {products.length} produit{products.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {products.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun produit pour le moment
          </p>
        ) : (
          <div className="space-y-2.5">
            {products.map((product) => (
              <div
                key={product.id}
                className={`row-surface flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  !product.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                      {product.name}
                    </p>
                    <Badge
                      variant={product.is_active ? 'default' : 'secondary'}
                      className="h-4 rounded-full px-1.5 text-[9px] font-medium"
                    >
                      {product.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  {product.description && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => handleToggleActive(product)}
                  >
                    {product.is_active ? 'Off' : 'On'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(product)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
