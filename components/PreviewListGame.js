import React from 'react'
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native'
import { Avatar, Badge } from 'react-native-elements'
import Swipeout from 'react-native-swipeout'

import { priorities } from '../shared/data'
import { fetchJSON } from '../shared/HTTP'

export default class PreviewListGame extends React.PureComponent {
  constructor(props) {
    super(props)

    let userSelection = props.userSelection || {}

    let notes = {}
    if (userSelection.notes !== '') {
      try {
        notes = JSON.parse(userSelection.notes)
      } catch (e) {
        // parse failed, so user must have a string note - convert to our format
        notes = {
          text: userSelection.notes
        }
      }
    }

    this.state = {
      thumbed: false,
      userSelection: {
        notes,
        priority: userSelection.priority
      }
    }
  }

  persistUserSelection = async changedAttrs => {
    const { itemId } = this.props
    const { userSelection } = this.state

    // merge state and changes together

    this.setState({ userSelection: { ...userSelection, ...changedAttrs } })

    const data = {
      ...userSelection,
      ...changedAttrs,
      itemid: itemId
    }
    // convert notes to json so we can store extra stuff in there
    const { notes } = data
    data.notes = Object.keys(notes).length === 0 ? '' : JSON.stringify(notes)

    // update the user selection on BGG for this item
    const { message } = await fetchJSON('/api/geekpreviewitems/userinfo', {
      method: 'POST',
      body: { data }
    })

    // check for success
    if (message === 'Info saved') {
      // update our main state back in PreviewScreen (to save a reload from BGG)
      this.props.setUserSelection(itemId, data)
    }
  }

  handleSwipeSeen = () => {
    const { userSelection } = this.state
    const {
      notes: { seen: oldSeen }
    } = userSelection

    const seen = !oldSeen
    const notes = Object.assign({}, userSelection.notes, { seen })

    this.persistUserSelection({ notes })
  }

  // todo: move to "reactions" not userSelections
  // handleSwipeThumbs = () => {
  //   const { userSelection } = this.state
  //   const seen = !userSelection.state
  //   this.setState({ userSelection: { ...userSelection, seen } })
  //   this.persistUserSelection({ seen })
  // }

  handleSwipePriority = async priority => {
    this.persistUserSelection({ priority })
  }

  _renderPriority = () => {
    const {
      userSelection: { priority }
    } = this.state

    const { name, color } = priorities.find(p => p.id === priority) || {}

    return color ? (
      <Badge
        style={styles.minorValue}
        value={name}
        textStyle={{ color: '#ffffff', fontSize: 9 }}
        containerStyle={{ backgroundColor: color }}
        wrapperStyle={{ flex: 1 }}
      />
    ) : null
  }

  _renderPrice = () => {
    return this.props.price !== 0 ? (
      <View style={styles.minor}>
        <Text style={styles.minorLabel}>MSRP</Text>
        <Text style={styles.minorValue}>
          {this.props.priceCurrency} {this.props.price}
        </Text>
      </View>
    ) : (
      <View style={styles.minor} />
    )
  }

  _renderSwipeButton = text => (
    <View
      style={{
        flex: 1,
        justifyContent: 'center'
      }}
    >
      <Text
        style={{
          textAlign: 'center',
          color: '#ffffff',
          fontSize: 12
        }}
      >
        {text}
      </Text>
    </View>
  )

  _renderNotes = () => {
    const {
      userSelection: {
        notes: { text }
      }
    } = this.state

    return text ? (
      <View style={styles.notesContainer}>
        <Text style={styles.minorLabel}>Notes</Text>
        <Text numberOfLines={2} style={styles.minorValue}>
          {text}
        </Text>
      </View>
    ) : null
  }

  render() {
    const { navigate } = this.props.navigation
    const {
      userSelection: { priority, notes }
    } = this.state
    const { seen } = notes

    // Right swipe buttons (Priority - Must Have, Not Interested, etc)
    const swipeoutRight = priorities
      .filter(p => ![-1, priority].includes(p.id))
      .map(({ id, color, name }) => ({
        component: this._renderSwipeButton(name),
        backgroundColor: color,
        onPress: () => this.handleSwipePriority(id)
      }))

    // Left swipe buttons (Seen, Thumbs Up, Notes)
    const swipeoutLeft = [
      {
        component: this._renderSwipeButton('Edit'),
        onPress: () =>
          navigate('EditNotes', {
            notes,
            persistUserSelection: this.persistUserSelection
          })
      },
      // {
      //   component: this._renderSwipeButton('Thumbs Up'),
      //   type: 'secondary',
      //   onPress: this.handleSwipeThumbs
      // },
      {
        component: this._renderSwipeButton(seen ? 'Not Seen' : 'Seen'),
        type: 'primary',
        onPress: this.handleSwipeSeen
      }
    ]

    return (
      <Swipeout left={swipeoutLeft} right={swipeoutRight} autoClose={true}>
        <TouchableOpacity
          onPress={() => {
            navigate('Game', { game: this.props.game })
          }}
        >
          <View
            style={styles.itemContainer}
            // onLayout={event => {
            //   var { x, y, width, height } = event.nativeEvent.layout
            //   console.log({ x, y, width, height })
            // }}
          >
            <View style={styles.mainContainer}>
              <Avatar
                large
                source={{ uri: this.props.thumbnail }}
                activeOpacity={0.7}
              />
              <View style={styles.gameDetails}>
                <Text numberOfLines={1} style={styles.gameName}>
                  {this.props.name}
                </Text>
                <Text style={{ fontFamily: 'lato-bold' }}>
                  {this.props.versionName}
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <View style={styles.minor}>
                    <Text style={styles.minorLabel}>Availability</Text>
                    <Text style={styles.minorValue}>{this.props.status}</Text>
                  </View>
                  {this._renderPrice()}
                  <View style={[styles.minor, styles.priority]}>
                    {this._renderPriority()}
                  </View>
                </View>
              </View>
            </View>
            {this._renderNotes()}
          </View>
        </TouchableOpacity>
      </Swipeout>
    )
  }
}

const styles = StyleSheet.create({
  itemContainer: {
    borderBottomWidth: 1,
    borderColor: '#132d3d',
    backgroundColor: '#ffffff',
    padding: 10
  },
  mainContainer: {
    height: 80,
    flexDirection: 'row'
  },
  notesContainer: {
    height: 60
  },
  gameDetails: {
    paddingLeft: 10,
    flex: 1,
    flexDirection: 'column'
  },
  gameName: {
    fontFamily: 'lato-bold',
    fontSize: 20
  },
  minor: {
    flex: 1,
    flexDirection: 'column'
  },
  minorLabel: {
    marginTop: 5,
    color: '#646465',
    fontSize: 12
  },
  minorValue: {
    fontSize: 14
  },
  priority: {
    paddingTop: 5
  }
})
