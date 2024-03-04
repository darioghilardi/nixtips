export const max = ({ width: width, height: height, depth: depth }) =>
  Math.max(Math.max(width, height), depth)

export const isInViewport = (element) => {
  const rect = element.getBoundingClientRect()
  return rect.bottom > 0
}
