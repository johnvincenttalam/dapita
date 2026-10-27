import authPanel640 from '@/assets/brand/photos/auth-panel-640.webp'
import authPanel1122 from '@/assets/brand/photos/auth-panel-1122.webp'
import getStartedBusiness640 from '@/assets/brand/photos/get-started-business-640.webp'
import getStartedBusiness1200 from '@/assets/brand/photos/get-started-business-1200.webp'
import getStartedCustomer640 from '@/assets/brand/photos/get-started-customer-640.webp'
import getStartedCustomer1200 from '@/assets/brand/photos/get-started-customer-1200.webp'
import homeHero960 from '@/assets/brand/photos/home-hero-960.webp'
import homeHero1916 from '@/assets/brand/photos/home-hero-1916.webp'
import welcome540 from '@/assets/brand/photos/welcome-540.webp'
import welcome941 from '@/assets/brand/photos/welcome-941.webp'

export interface BrandPhotoSource {
  src: string
  srcSet: string
  /** Intrinsic size of the largest file, so the browser reserves space before it loads. */
  width: number
  height: number
}

function source(small: [string, number], large: [string, number], height: number): BrandPhotoSource {
  return { src: large[0], srcSet: `${small[0]} ${small[1]}w, ${large[0]} ${large[1]}w`, width: large[1], height }
}

/**
 * Brand photography supplied by the product owner (AI-generated, docs/image-prompts.md Set A).
 * The people and salons are fictional.
 */
export const brandPhotos = {
  welcome: source([welcome540, 540], [welcome941, 941], 1672),
  authPanel: source([authPanel640, 640], [authPanel1122, 1122], 1402),
  homeHero: source([homeHero960, 960], [homeHero1916, 1916], 821),
  getStartedCustomer: source([getStartedCustomer640, 640], [getStartedCustomer1200, 1200], 675),
  getStartedBusiness: source([getStartedBusiness640, 640], [getStartedBusiness1200, 1200], 675),
} satisfies Record<string, BrandPhotoSource>
