export const all = []

export const handleBuildStageChanges = () => {
  all.forEach(buildStage => buildStage.checkState())
}

export default class BuildStage {
  constructor(parent, name, dependencies, disabled) {
    this.parent = parent
    this.name = name
    this.dependencies = dependencies

    this.dependents = []
    this.state = disabled ? `disabled` : `blocked`
    this.fullName = parent ? `${parent.fullName}/${name}` : name

    if (disabled) {
      this.log(`Disabled.`)
    }

    if (parent) {
      parent.children.push(this)
    }
    all.push(this)
    for (const dependency of this.dependencies) {
      dependency.dependents.push(this)
      if (dependency.state == `disabled` && this.state != `disabled`) {
        this.log(`Disabled by dependency "${dependency.name}".`)
        this.state = `disabled`
      }
    }
  }

  criticalStop(error) {
    this.log(`CRITICAL STOP - ${error}`)
    process.exit(1)
  }

  oneOff() {
    if (this.parent) {
      return this.parent.oneOff()
    } else {
      this.criticalStop(`"oneOff" is only implemented for BuildStages with parents`)
    }
  }

  handle(potentialError, onSuccess) {
    if (!onSuccess) {
      potentialError = potentialError || `An error occurred but could not be reported`
    }

    if (potentialError) {
      if (this.oneOff()) {
        this.criticalStop(potentialError)
      } else {
        this.log(`Failed; "${potentialError}"`)
        this.state = `failed`
        handleBuildStageChanges()
      }
    } else {
      onSuccess()
    }
  }

  log(message) {
    console.log(`${this.fullName} - ${message}`)
  }

  start() {
    switch (this.state) {
      case `running`:
        this.log(`Start requested; waiting for opportunity to restart...`)
        this.state = `restarting`
        break
      case `done`:
        this.log(`Start requested; discarding previous result and invalidating dependents...`)
        this.state = `blocked`
        this.dependents.forEach(dependent => dependent.invalidate(1))
        break
      case `failed`:
        this.log(`Start requested; restarting following previous failure...`)
        this.state = `blocked`
        this.dependents.forEach(dependent => dependent.invalidate(1))
        break
      case `blocked`:
      case `restarting`:
      case `disabled`:
        break
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "start".`)
    }
    if (this.parent) {
      this.parent.start()
    } else {
      handleBuildStageChanges()
    }
  }

  invalidate(levels) {
    switch (this.state) {
      case `running`:
        this.log(`${`\t`.repeat(levels)}Running; restarting.`)
        this.state = `restarting`
        break

      case `done`:
        this.log(`${`\t`.repeat(levels)}Previous completion invalidated.`)
        this.state = `blocked`
        this.dependents.forEach(dependent => dependent.invalidate(levels + 1))
        break

      case `failed`:
        this.log(`${`\t`.repeat(levels)}Previous failure invalidated.`)
        this.state = `blocked`
        this.dependents.forEach(dependent => dependent.invalidate(levels + 1))
        break

      case `blocked`:
      case `restarting`:
      case `disabled`:
        break
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "invalidate".`)
    }

    if (this.parent) {
      this.parent.invalidate(levels + 1)
    }
  }

  blocksDependents() {
    switch (this.state) {
      case `done`:
        return false
      case `blocked`:
      case `running`:
      case `restarting`:
      case `disabled`:
      case `failed`:
        return true
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "blocksDependents".`)
    }
  }

  blocksDependencies() {
    switch (this.state) {
      case `running`:
      case `restarting`:
        return true
      case `blocked`:
      case `done`:
      case `failed`:
        return this.dependents.some(dependent => dependent.blocksDependencies())
      case `disabled`:
        return false
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "blocksDependencies".`)
    }
  }

  done() {
    switch (this.state) {
      case `running`:
        this.log(`Done.`)
        this.state = `done`
        handleBuildStageChanges()
        break
      case `restarting`:
        if (this.canStart()) {
          this.log(`Done, but restarting...`)
          this.state = `running`
          this.performStart()
        } else {
          this.log(`Done, but restart blocked.`)
          this.state = `blocked`
          handleBuildStageChanges()
        }
        break
      case `stopping`:
        this.log(`Stopped.`)
        this.state = `stopped`
        break
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "done".`)
    }
  }

  couldStart() {
    switch (this.state) {
      case `blocked`:
        if (this.dependencies.some(dependency => !dependency.couldStart())) {
          return false
        }
        return true

      case `done`:
      case `running`:
      case `restarting`:
        return true

      case `failed`:
      case `disabled`:
        return false

      default:
        this.criticalStop(`State "${this.state}" is not implemented by "couldStart".`)
    }
  }

  canStart() {
    if (this.dependencies.some(dependency => dependency.blocksDependents())) {
      return false
    }

    if (this.dependents.some(dependent => dependent.blocksDependencies())) {
      return false
    }

    if (this.parent && this.parent.blocksChildren()) {
      return false
    }

    return true
  }

  checkState() {
    switch (this.state) {
      case `blocked`:
        if (!this.canStart()) {
          return
        }

        this.log(`Starting...`)
        this.state = `running`
        this.performStart()
        break
      case `running`:
      case `restarting`:
      case `done`:
      case `disabled`:
      case `failed`:
        break
      default:
        this.criticalStop(`State "${this.state}" is not implemented by "checkState".`)
    }
  }

  performStart() {
    this.criticalStop(`"performStart" is not implemented.`)
  }

  get(path) {
    const child = this.children.find(child => child.name == path[0])

    if (!child) {
      return null
    }

    if (path.length == 1) {
      return child
    } else {
      return child.get(path.slice(1))
    }
  }

  stop() {
    switch (this.state) {
      case `done`:
      case `failed`:
      case `blocked`:
      case `disabled`:
        this.log(`Stopped.`)
        this.state = `stopped`
        break

      case `running`:
      case `restarting`:
        this.log(`Stopping...`)
        this.state = `stopping`
        break

      default:
        this.criticalStop(`State "${this.state}" is not implemented by "start".`)
    }

    all.splice(all.indexOf(this), 1)

    if (this.parent) {
      this.parent.children.splice(this.parent.children.indexOf(this), 1)
    }

    this.dependencies.forEach(dependency => dependency.dependents.splice(dependency.dependents.indexOf(this), 1))
    this.dependencies.length = 0

    this.dependents.forEach(dependent => dependent.stop())
  }
}
