import { empty as emptyArray, getMonoid as getArrayMonoid, getSetoid as getArraySetoid, array } from './Array'
import { Either, getSetoid as getEitherSetoid, left, right } from './Either'
import { Group } from './Group'
import { Setoid, fromEquals } from './Setoid'
import { Monad1 } from './Monad'

// Adapted from https://hackage.haskell.org/package/free-algebras-0.0.7.0/docs/Data-Group-Free.html

declare module './HKT' {
  interface URI2HKT<A> {
    FreeGroup: FreeGroup<A>
  }
}

export const URI = 'FreeGroup'

export type URI = typeof URI

/**
 * The free group generated by elements of `A`, up to equality. Note that the `Setoid` and `Monoid` instances differ
 * from the standard such instances for `Array<Either<A, A>>`; two elements of the free group are equal iff they are equal
 * after being reduced to "canonical form", i.e., cancelling adjacent inverses.
 *
 * @data
 * @constructor FreeGroup
 * @since 1.13.0
 */
export class FreeGroup<A> {
  readonly _A!: A
  readonly _URI!: URI
  constructor(readonly value: Array<Either<A, A>>) {}
  map<B>(f: (a: A) => B): FreeGroup<B> {
    return new FreeGroup(this.value.map(e => e.bimap(f, f)))
  }
  ap<B>(fab: FreeGroup<(a: A) => B>): FreeGroup<B> {
    return fab.chain(f => this.map(f)) // <- derived
  }
  ap_<B, C>(this: FreeGroup<(b: B) => C>, fb: FreeGroup<B>): FreeGroup<C> {
    return fb.ap(this)
  }
  chain<B>(f: (a: A) => FreeGroup<B>): FreeGroup<B> {
    return new FreeGroup(array.chain(this.value, e => e.bimap(f, f).value.value))
  }
}

const of = <A>(a: A): FreeGroup<A> => {
  return new FreeGroup([right(a)])
}

const map = <A, B>(fa: FreeGroup<A>, f: (a: A) => B): FreeGroup<B> => {
  return fa.map(f)
}

const ap = <A, B>(fab: FreeGroup<(a: A) => B>, fa: FreeGroup<A>): FreeGroup<B> => {
  return fa.ap(fab)
}

const chain = <A, B>(fa: FreeGroup<A>, f: (a: A) => FreeGroup<B>): FreeGroup<B> => {
  return fa.chain(f)
}

/**
 * Smart constructor which normalizes an array
 *
 * @since 1.13.0
 */
export const fromArray = <A>(S: Setoid<A>): ((as: Array<Either<A, A>>) => FreeGroup<A>) => {
  const normalizeS = normalize(S)
  return as => new FreeGroup(normalizeS(as))
}

/**
 * Reduce a term of a free group to canonical form, i.e. cancelling adjacent inverses.
 *
 * @since 1.13.0
 */
export const normalize = <A>(S: Setoid<A>) => (g: Array<Either<A, A>>): Array<Either<A, A>> => {
  return g.reduceRight((acc: Array<Either<A, A>>, s) => {
    if (acc.length > 0) {
      const head = acc[0]
      const tail = acc.slice(1)
      if (head._tag !== s._tag && S.equals(head.value, s.value)) {
        return tail
      }
    }
    acc.unshift(s)
    return acc
  }, [])
}

/**
 * @since 1.13.0
 */
export const getSetoid = <A>(S: Setoid<A>): Setoid<FreeGroup<A>> => {
  const AS = getArraySetoid(getEitherSetoid(S, S))
  const normalizeS = normalize(S)
  return fromEquals((x, y) => AS.equals(normalizeS(x.value), normalizeS(y.value)))
}

/**
 * @since 1.13.0
 */
export const empty: FreeGroup<never> = new FreeGroup(emptyArray)

/**
 * @since 1.13.0
 */
export const getGroup = <A>(S: Setoid<A>): Group<FreeGroup<A>> => {
  const M = getArrayMonoid<Either<A, A>>()
  const normalizeS = normalize(S)
  return {
    concat: (x, y) => new FreeGroup(normalizeS(M.concat(x.value, y.value))),
    empty,
    inverse: x => new FreeGroup(x.value.reverse().map(s => (s.isLeft() ? right(s.value) : left(s.value))))
  }
}

/**
 * @since 1.13.0
 */
export const freeGroup: Monad1<URI> = {
  URI,
  of,
  map,
  ap,
  chain
}