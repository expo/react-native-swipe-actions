/**
 * Copyright 2015-present 650 Industries. All rights reserved.
 *
 * @providesModule SwipeActions
 */
'use strict';

import React, {
  Animated,
  Easing,
  PanResponder,
  PropTypes,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const START_SWIPE_THRESHOLD = 5;
const HORIZONTAL_SWIPE_MULTIPLE = 4;
const ACTION_BUTTON_DEFAULT_WIDTH = 90;
const ANIMATION_DURATION_MS = 50;
const CLOSE_SWIPE_ACTIONS_EVENT = 'closeSwipeActions';

/**
 * `actions` prop is an array of objects with `text`, `style`,
 * `width`, and `onPress` fields.
 */
export default class SwipeActions extends React.Component {
  static propTypes = {
    actionContainerStyle: View.propTypes.style,
    actions: PropTypes.array.isRequired,
    events: PropTypes.object,
  };

  static defaultProps = {
    springBounciness: 3,
  };

  static CLOSE_SWIPE_ACTIONS_EVENT = CLOSE_SWIPE_ACTIONS_EVENT;

  constructor(props, context) {
    super(props, context);

    this._onLayout = this._onLayout.bind(this);
    this._onPanResponderEnd = this._onPanResponderEnd.bind(this);

    this.state = {
      width: 0,
      height: 0,
      isVisible: false,
      isAnimating: false,
      xOffset: new Animated.Value(0),
    };
  }

  componentWillMount() {
    this.state.xOffset.addListener(({value}) => {
      this._xOffsetValue = value;
    });

    this._panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, {dx, dy}) => {
        return (
          Math.abs(dx) > START_SWIPE_THRESHOLD &&
          Math.abs(dx) > Math.abs(dy) * HORIZONTAL_SWIPE_MULTIPLE
        );
      },
      onPanResponderGrant: (e, gestureState) => {
        if (typeof this._xOffsetValue !== 'undefined') {
          this.state.xOffset.setOffset(this._xOffsetValue);
          this.state.xOffset.setValue(0);
        }

        this.props.events &&
          this.props.events.emit(CLOSE_SWIPE_ACTIONS_EVENT, this);
      },

      onPanResponderMove: (evt, {dx}) => {
        let xOffset = dx + (this.state.isVisible ? -this._totalWidth() : 0);

        if (xOffset > 0) {
          xOffset = 0;
        } else if (xOffset < -this._totalWidth()) {
          xOffset = -this._totalWidth();
        }

        this.state.xOffset.setValue(dx);
      },

      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: this._onPanResponderEnd,
      onPanResponderRelease: this._onPanResponderEnd,
    });
  }

  componentDidMount() {
    if (this.props.events) {
      this._subscription = this.props.events.addListener(
        CLOSE_SWIPE_ACTIONS_EVENT,
        exemptId => {
          if (this === exemptId || !this.state.isVisible) {
            return;
          }

          this._animate(false);
        },
      );
    }
  }

  componentWillUnmount() {
    this._subscription && this._subscription.remove();
  }

  render() {
    let actionViewRight = 0;
    let actionViews = this.state.width === 0 ?
        null : this.props.actions.map((action, index) => {
      let actionWidth = (action.width != null) ? action.width : ACTION_BUTTON_DEFAULT_WIDTH;
      let result = (
        <TouchableOpacity
          key={index}
          onPress={action.onPress}
          style={[
            styles.actionContainer,
            action.style,
            this.props.actionContainerStyle,
            { right: actionViewRight,
              width: actionWidth,
              height: this.state.height, }
          ]}>
          <Text style={styles.actionText}>
            {action.text}
          </Text>
        </TouchableOpacity>
      );
      actionViewRight += actionWidth;
      return result;
    });

    let totalWidth = this._totalWidth();

    let translateX = this.state.xOffset.interpolate({
      inputRange: [-totalWidth - 300, -totalWidth, 0, 100],
      outputRange: [-totalWidth - 210, -totalWidth, 0, 30],
    });

    return (
      <View onLayout={this._onLayout} style={styles.container}>
        {actionViews}
        <Animated.View
          {...this._panResponder.panHandlers}
          style={{
            transform: [{translateX}],
            width: this.state.width,
          }}>
          {this.props.children}
        </Animated.View>
      </View>
    );
  }

  _totalWidth() {
    let result = 0;
    this.props.actions.forEach(action => {
      result += (action.width != null) ? action.width : ACTION_BUTTON_DEFAULT_WIDTH;
    });
    return result;
  }

  _onLayout(event) {
    this.setState({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  }

  _onPanResponderEnd(e, {vx}) {
    this.state.xOffset.flattenOffset();

    let threshold = this.state.isVisible ? -this._totalWidth() * 0.75 :
        -this._totalWidth() * 0.25;
    let isVisible = this.state.xOffset.__getValue() < threshold;
    this._animate(isVisible, vx);
  }

  _animate(isVisible, vx) {
    this.setState({
      isVisible,
    });

    // TODO: account for velocity of pan gesture when it ended.
    Animated.spring(this.state.xOffset, {
      toValue: isVisible ? -this._totalWidth() : 0,
      bounciness: this.props.springBounciness,
    }).start();
  }
}

let styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
