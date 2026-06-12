import emitter from '@adonisjs/core/services/emitter'
import SimulatorLeadCreated from '#events/simulator_lead_created'

emitter.listen(SimulatorLeadCreated, [() => import('#listeners/on_simulator_lead_created')])
