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
import {
  SettingsListPage,
  SettingsItemMeta,
  SettingsItemTitle,
} from '@/components/system-ui/settings/SettingsListPage'
import { toast } from 'sonner'

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
    } catch {
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const handleAdd = () => {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  const handleEdit = (p: Product) => {
    setEditingProduct(p)
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
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const handleToggleActive = async (p: Product) => {
    try {
      await toggleProductActive(p.id, !p.is_active)
      toast.success(p.is_active ? `${p.name} désactivé` : `${p.name} réactivé`)
      await fetchProducts()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProduct(deleteTarget.id)
      toast.success(`${deleteTarget.name} supprimé`)
      setDeleteTarget(null)
      await fetchProducts()
    } catch {
      toast.error('Impossible de supprimer ce produit.')
    }
  }

  return (
    <>
      <SettingsListPage
        title="Produits"
        subtitle="Gérez les produits pour le suivi fournisseurs."
        items={products}
        loading={loading}
        emptyMessage="Aucun produit pour le moment."
        addLabel="Ajouter un produit"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onDelete={(item) => setDeleteTarget(item)}
        renderTitle={(item) => (
          <SettingsItemTitle
            name={item.name}
            isActive={item.is_active ?? true}
            activeLabel="Actif"
            inactiveLabel="Inactif"
          />
        )}
        renderMeta={(item) =>
          item.description ? (
            <SettingsItemMeta>
              <span className="truncate">{item.description}</span>
            </SettingsItemMeta>
          ) : undefined
        }
      />

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
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </>
  )
}
