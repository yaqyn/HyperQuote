// Comprehensive stub for node:stream — only used by server-side code that
// leaks into the client module graph during dev. These classes are never
// actually called on the client; they just need to exist so imports resolve.

class Readable {
	static from() {
		return new Readable()
	}
	pipe() {
		return this
	}
	on() {
		return this
	}
	read() {
		return null
	}
	destroy() {
		return this
	}
}

class Writable {
	write() {
		return true
	}
	end() {
		return this
	}
	on() {
		return this
	}
	destroy() {
		return this
	}
}

class Duplex extends Readable {
	write() {
		return true
	}
	end() {
		return this
	}
}

class Transform extends Duplex {}
class PassThrough extends Transform {}

export { Duplex, PassThrough, Readable, Transform, Writable }
export default { Readable, Writable, Duplex, Transform, PassThrough }
