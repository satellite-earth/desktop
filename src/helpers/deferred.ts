export type Deferred<T> = Promise<T> & {
	resolve: (value?: T | PromiseLike<T>) => void;
	reject: (reason?: any) => void;
};

/** Creates a Promise that can be controlled from the outside */
export default function createDefer<T>() {
	let _resolve: (value?: T | PromiseLike<T>) => void;
	let _reject: (reason?: any) => void;
	const promise = new Promise<T>((resolve, reject) => {
		// @ts-expect-error
		_resolve = resolve;
		_reject = reject;
	}) as Deferred<T>;

	// @ts-expect-error
	promise.resolve = _resolve;
	// @ts-expect-error
	promise.reject = _reject;

	return promise;
}
