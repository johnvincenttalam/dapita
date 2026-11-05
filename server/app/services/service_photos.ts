import type { MultipartFile } from '@adonisjs/core/bodyparser'
import Service from '#models/service'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { isUploadedServicePhoto, type StoredServicePhoto } from '#helpers/photos'
import { serviceNotFound, withMenu } from '#services/merchant_services'
import { storeWebpCopies } from '#services/photo_upload'
import { deleteUploaded } from '#services/photo_storage'
import { toServiceData } from '#services/shops'
import { photoMessages, type ID, type Service as ServiceData } from '#shared/domain'

/**
 * A service's photo. Files are written before the row changes and deleted again
 * if the change fails; a replaced or removed photo's files go once the change is
 * saved. Seeded photos have no files, so nothing is deleted for them. Callers
 * check membership first (`requireMember`).
 */

/** Checks the file and writes its WebP copies under a fresh key. */
async function store(serviceId: ID, file: MultipartFile | null) {
  const storageKey = `services/${serviceId}/${newId('ph')}`
  await storeWebpCopies(storageKey, file)
  return storageKey
}

/** Sets the service's photo under the menu lock and returns the one it replaced, if any. */
async function changePhoto(
  businessId: ID,
  serviceId: ID,
  edit: (service: Service) => StoredServicePhoto | null
) {
  let replaced: StoredServicePhoto | null = null
  const data = await withMenu(businessId, async (_business, trx) => {
    const service = await Service.query({ client: trx })
      .where({ id: serviceId, businessId })
      .first()
    if (!service) throw serviceNotFound()
    replaced = service.photo
    service.photo = edit(service)
    await service.save()
    return toServiceData(service)
  })
  return { data, replaced: replaced as StoredServicePhoto | null }
}

async function dropFiles(photo: StoredServicePhoto | null) {
  if (photo && isUploadedServicePhoto(photo)) await deleteUploaded([photo.storageKey])
}

export async function setServicePhoto(
  businessId: ID,
  serviceId: ID,
  file: MultipartFile | null
): Promise<ServiceData> {
  const storageKey = await store(serviceId, file)
  try {
    const { data, replaced } = await changePhoto(businessId, serviceId, () => ({ storageKey }))
    await dropFiles(replaced)
    return data
  } catch (error) {
    await deleteUploaded([storageKey])
    throw error
  }
}

export async function removeServicePhoto(businessId: ID, serviceId: ID): Promise<ServiceData> {
  const { data, replaced } = await changePhoto(businessId, serviceId, (service) => {
    if (!service.photo) throw new ApiError(photoMessages.notFound, 404)
    return null
  })
  await dropFiles(replaced)
  return data
}
