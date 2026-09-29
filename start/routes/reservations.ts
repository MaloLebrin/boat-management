import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import {
  calendarFeedThrottle,
  publicBookingRequestThrottle,
  publicBookingThrottle,
} from '#start/limiter'

const ReservationsController = () => import('#controllers/reservations_controller')
const FleetExportsController = () => import('#controllers/fleet_exports_controller')
const CalendarFeedsController = () => import('#controllers/calendar_feeds_controller')
const PublicBookingsController = () => import('#controllers/public_bookings_controller')

// Flux iCal publié par jeton (#880) : lu par les agendas et les plateformes,
// sans session. Le jeton est vérifié par le contrôleur (404 muet sinon).
router
  .get('calendar/:file', [CalendarFeedsController, 'show'])
  .as('calendar.feed')
  .use(calendarFeedThrottle)

// Page publique de réservation (#881) : sans session, le client final du
// loueur voit les disponibilités d'un bateau et envoie une demande.
router
  .get('book/:orgSlug', [PublicBookingsController, 'fleet'])
  .as('book.fleet')
  .use(publicBookingThrottle)
router
  .get('book/:orgSlug/:boatSlug', [PublicBookingsController, 'show'])
  .as('book.show')
  .use(publicBookingThrottle)
router
  .post('book/:orgSlug/:boatSlug/request', [PublicBookingsController, 'request'])
  .as('book.request')
  .use(publicBookingRequestThrottle)

router
  .group(() => {
    router.get('reservations', [ReservationsController, 'index']).as('reservations.index')
    // Export des réservations de la flotte, avec période (#879).
    router
      .get('reservations/export.csv', [FleetExportsController, 'reservations'])
      .as('reservations.export')
    // Flux iCal de toute la flotte (#880).
    router
      .post('reservations/calendar-feed', [CalendarFeedsController, 'regenerateForFleet'])
      .as('reservations.calendarFeed.regenerate')
    router
      .patch('reservations/calendar-feed', [CalendarFeedsController, 'updateForFleet'])
      .as('reservations.calendarFeed.update')
    router
      .delete('reservations/calendar-feed', [CalendarFeedsController, 'revokeForFleet'])
      .as('reservations.calendarFeed.revoke')
  })
  .use([middleware.auth(), middleware.requireModulePlan({ feature: 'reservations' })])
