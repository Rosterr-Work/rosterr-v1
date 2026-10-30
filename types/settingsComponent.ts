import React from "react";

export type FC<P = {}> = React.FC<P> & {
	title?: string,
	isAboveOthers?: boolean,
	/** One plain sentence under the title saying what the panel does. */
	description?: string,
};